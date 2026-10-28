// Teams share the owner's lists, contact reveals and property notes; credits
// stay per user. Users without a team must behave exactly as before.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  closeDb,
  createList,
  db,
  initDb,
  insertRaw,
  resetData,
  rows,
} from "./helpers.js";

const team = await import("../src/services/teamService.js");
const plan = await import("../src/services/planService.js");
const credit = await import("../src/services/creditService.js");
const agent = await import("../src/services/agentStateService.js");
const { deleteUser } = await import("../src/services/userService.js");
const { updateProperties } = await import("../src/services/propertyService.js");

const OWNER = { id: "auth0|owner", email: "owner@example.com" };
const MATE = { id: "auth0|mate", email: "mate@example.com" };
const STARTER = { id: "auth0|starter", email: "starter@example.com" };

let listA: string;
let listB: string;
let p1: string;
let p2: string;
let p3: string;

async function setPlan(userId: string, planId: string): Promise<void> {
  await plan.upsertPaidPlanSubscription({
    userId,
    planId,
    stripeSubscriptionId: `sub_${userId}`,
    stripeCustomerId: `cus_${userId}`,
    status: "active",
    currentPeriodStart: new Date().toISOString(),
    currentPeriodEnd: new Date(Date.now() + 30 * 864e5).toISOString(),
  });
}

async function snap(userId: string) {
  const p = await plan.getUserPlanWithDefinition(userId);
  return p ? { id: p.plan.id, isActive: p.isActive } : null;
}

async function invite(from: { id: string; email: string }, email: string) {
  return team.inviteToTeam({
    inviterId: from.id,
    inviterEmail: from.email,
    email,
    plan: await snap(from.id),
  });
}

async function join(user: { id: string; email: string }) {
  const [invitation] = await team.getIncomingInvitations(user.email);
  return team.acceptInvitation({
    userId: user.id,
    userEmail: user.email,
    invitationId: invitation.id,
    plan: await snap(user.id),
  });
}

before(initDb);
beforeEach(async () => {
  // Children first: foreign keys are enforced
  for (const table of [
    "user_property_reveals",
    "team_property_state",
    "team_invitations",
    "team_members",
    "teams",
    "property_agent_state",
    "user_list_access",
    "credit_transactions",
    "user_credits",
    "user_plan_subscriptions",
  ]) {
    await db.execute(`DELETE FROM ${table}`);
  }
  await resetData();
  await db.execute("DELETE FROM users WHERE id LIKE 'auth0|%' AND id != 'auth0|agent'");
  for (const u of [OWNER, MATE, STARTER]) {
    await db.execute({
      sql: "INSERT INTO users (id, email) VALUES (?, ?)",
      args: [u.id, u.email],
    });
  }

  listA = await createList("Madrid");
  listB = await createList("Barcelona");
  p1 = await insertRaw(listA, "https://example.com/1", "600000001", "2026-09-01T00:00:00Z");
  p2 = await insertRaw(listA, "https://example.com/2", "600000002", "2026-09-02T00:00:00Z");
  p3 = await insertRaw(listB, "https://example.com/3", "600000003", "2026-09-03T00:00:00Z");

  await setPlan(OWNER.id, "pro");
  await setPlan(MATE.id, "pro");
  await setPlan(STARTER.id, "starter");
  for (const u of [OWNER, MATE, STARTER]) {
    await credit.resetPlanCredits({ userId: u.id, newAmount: 10 });
  }
  await plan.addUserListAccess(OWNER.id, listA);
  await plan.addUserListAccess(MATE.id, listB);
});
after(closeDb);

describe("without a team", () => {
  test("lists, reveals and notes stay personal", async () => {
    assert.equal(await team.getTeamContext(MATE.id), null);
    assert.equal(await team.getListOwnerId(MATE.id), MATE.id);
    assert.equal(await team.canManageLists(MATE.id), true);
    assert.equal(await plan.canAccessList(MATE.id, listB), true);
    assert.equal(await plan.canAccessList(MATE.id, listA), false);

    await credit.spendCreditForReveal({ userId: OWNER.id, propertyId: p1 });
    assert.equal((await credit.getRevealedPropertyIds(MATE.id, [p1])).size, 0);

    await agent.updatePropertyComment(MATE.id, p3, "mi nota");
    const page = await agent.getPropertiesWithAgentState(MATE.id, listB);
    assert.equal(page.data[0].comment, "mi nota");
    const personal = await db.execute("SELECT COUNT(*) AS c FROM property_agent_state");
    assert.equal(Number(personal.rows[0].c), 1);
  });
});

describe("in a team", () => {
  test("the first invitation creates the team and moves the owner's notes", async () => {
    await agent.updatePropertyComment(OWNER.id, p1, "nota del owner");
    assert.equal((await invite(OWNER, "nuevo@x.com")).ok, true);
    assert.equal((await invite(OWNER, " OWNER@example.com ")).ok, false);

    const ctx = await team.getTeamContext(OWNER.id);
    assert.equal(ctx?.ownerId, OWNER.id);
    assert.equal(ctx?.planId, "pro");
    assert.equal((await agent.getPropertyAgentState(OWNER.id, p1))?.comment, "nota del owner");
  });

  test("members work on the owner's lists and share reveals and notes", async () => {
    await agent.updatePropertyState(OWNER.id, p1, "contacted");
    await agent.updatePropertyComment(MATE.id, p1, "nota previa del mate");
    await credit.spendCreditForReveal({ userId: OWNER.id, propertyId: p1 });
    await invite(OWNER, MATE.email);
    assert.equal((await join(MATE)).ok, true);

    // Lists: the owner's, managed only by the owner
    assert.equal(await plan.canAccessList(MATE.id, listA), true);
    assert.equal(await plan.canAccessList(MATE.id, listB), false);
    assert.equal(await team.canManageLists(MATE.id), false);
    assert.equal(await team.canManageLists(OWNER.id), true);

    // Notes merged on join: the team's state wins, a missing note is filled in
    const merged = await agent.getPropertyAgentState(MATE.id, p1);
    assert.equal(merged?.state, "contacted");
    assert.equal(merged?.comment, "nota previa del mate");

    // Reveals shared, credits separate
    const spend = await credit.spendCreditForReveal({ userId: MATE.id, propertyId: p1 });
    assert.equal(spend.alreadyRevealed, true);
    await credit.spendCreditForReveal({ userId: MATE.id, propertyId: p2 });
    assert.equal((await credit.getRevealedPropertyIds(OWNER.id, [p1, p2])).size, 2);
    assert.equal((await credit.getBalance(OWNER.id)).total, 9);
    assert.equal((await credit.getBalance(MATE.id)).total, 9);

    // Notes and state counts are the team's
    await agent.updatePropertyState(MATE.id, p2, "captured");
    const page = await agent.getPropertiesWithAgentState(OWNER.id, listA);
    assert.equal(page.stateCounts.captured, 1);
    assert.equal(page.stateCounts.contacted, 1);
  });

  test("joining needs the same plan and a free seat", async () => {
    await invite(OWNER, STARTER.email);
    const r = await join(STARTER);
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.reason, "plan_mismatch");

    for (const email of ["a@x.com", "b@x.com", "c@x.com"]) await invite(OWNER, email);
    const full = await invite(OWNER, "d@x.com");
    assert.equal(!full.ok && full.reason, "team_full");
    assert.equal((await invite(MATE, "z@x.com")).ok, true); // MATE has no team yet
  });

  test("a member who changes plan leaves with their reveals, a copy of the notes and their own lists", async () => {
    await credit.spendCreditForReveal({ userId: OWNER.id, propertyId: p1 });
    await invite(OWNER, MATE.email);
    await join(MATE);
    await credit.spendCreditForReveal({ userId: MATE.id, propertyId: p2 });
    await agent.updatePropertyComment(MATE.id, p2, "compartida");

    await setPlan(MATE.id, "starter");

    assert.equal(await team.getTeamContext(MATE.id), null);
    assert.equal(await plan.canAccessList(MATE.id, listB), true);
    assert.deepEqual([...(await credit.getRevealedPropertyIds(MATE.id, [p1, p2]))], [p2]);
    assert.deepEqual([...(await credit.getRevealedPropertyIds(OWNER.id, [p1, p2]))], [p1]);
    assert.equal((await agent.getPropertyAgentState(MATE.id, p2))?.comment, "compartida");
    assert.equal((await agent.getPropertyAgentState(OWNER.id, p2))?.comment, "compartida");
  });

  test("the owner changing plan dissolves the team; alone, the team follows the plan", async () => {
    await invite(OWNER, MATE.email);
    await join(MATE);
    await agent.updatePropertyComment(MATE.id, p1, "nota");

    await setPlan(OWNER.id, "unlimited");
    assert.equal(await team.getTeamContext(MATE.id), null);
    assert.equal(await team.getTeamContext(OWNER.id), null);
    const left = await db.execute(
      "SELECT (SELECT COUNT(*) FROM teams) + (SELECT COUNT(*) FROM team_members) + (SELECT COUNT(*) FROM team_property_state) AS c",
    );
    assert.equal(Number(left.rows[0].c), 0);
    assert.equal((await agent.getPropertyAgentState(MATE.id, p1))?.comment, "nota");

    await invite(OWNER, MATE.email);
    await setPlan(OWNER.id, "pro");
    assert.equal((await team.getTeamContext(OWNER.id))?.planId, "pro");
  });

  test("removing, leaving and deleting the owner's account", async () => {
    await invite(OWNER, MATE.email);
    await join(MATE);
    assert.equal((await team.removeMember({ ownerId: MATE.id, memberId: OWNER.id })).ok, false);
    assert.equal((await team.removeMember({ ownerId: OWNER.id, memberId: MATE.id })).ok, true);
    assert.equal(await team.getTeamContext(MATE.id), null);

    await invite(OWNER, MATE.email);
    await join(MATE);
    assert.equal(await team.leaveTeam(MATE.id), "left");

    await invite(OWNER, MATE.email);
    await join(MATE);
    await deleteUser(OWNER.id);
    assert.equal(await team.getTeamContext(MATE.id), null);
    const members = await db.execute("SELECT COUNT(*) AS c FROM team_members");
    assert.equal(Number(members.rows[0].c), 0);
  });
});

describe("dedupe", () => {
  test("a property with team notes is never removed as a duplicate", async () => {
    await invite(OWNER, MATE.email);
    await join(MATE);
    const older = await insertRaw(listB, "https://www.idealista.com/inmueble/111/", null, "2026-09-01T00:00:00Z");
    const noted = await insertRaw(listB, "https://www.habitaclia.com/i500000000001.htm", "685123456", "2026-09-02T00:00:00Z");
    await agent.updatePropertyComment(MATE.id, noted, "llamar el lunes");

    const r = await updateProperties(listB, [
      { price: 150000, sourceUrl: "https://www.idealista.com/inmueble/111/", phone: "685123456" },
    ]);
    assert.deepEqual(r.removedDuplicateIds, [older]);
    assert.ok((await rows(listB)).some((x) => x.id === noted));
  });
});

describe("legacy data", () => {
  test("orphan notes of deleted properties do not block creating a team", async () => {
    await db.execute("PRAGMA foreign_keys = OFF");
    await db.execute({
      sql: "INSERT INTO property_agent_state (user_id, property_id, state) VALUES (?, 'gone', 'contacted')",
      args: [OWNER.id],
    });
    await db.execute("PRAGMA foreign_keys = ON");

    assert.equal((await invite(OWNER, MATE.email)).ok, true);
    assert.equal((await join(MATE)).ok, true);
    assert.equal(await team.leaveTeam(OWNER.id), "dissolved");
  });
});
