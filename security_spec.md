# Security Specification - The Wisdom Lounge

## Data Invariants
1. A learner registration must have `isApproved: false` by default when coming from the public sign-up.
2. Only an admin can set `isApproved: true`.
3. Learners can only see their own private fields (if we split them) or we use the "password" logic which is currently client-side checked. (Note: Security rules can't check a plaintext password field securely without Auth, so for now we allow reading the collection but could restrict writing).
4. `id` must be a valid string (phone number).

## The Dirty Dozen Payloads
1. Create a learner with `isApproved: true` as a public user. -> DENIED
2. Update another learner's `tasksCompleted` as a different learner. -> DENIED
3. Delete a learner as a public user. -> DENIED
4. Create a learner with a 1MB string in `fullName`. -> DENIED
5. Update a learner's `isApproved` status without admin rights. -> DENIED
6. Spoofing `joinedAt` to a past date. -> DENIED
7. Injecting a "Ghost Field" `isVerified: true`. -> DENIED
8. Deleting an admin record. -> DENIED
9. Registering with an ID that already exists (handled by Firestore unique IDs).
10. Reading all passwords as a public user (if we don't isolate them). -> SHOULD BE ISOLATED OR DENIED IF POSSIBLE.
11. Changing `id` of an existing learner. -> DENIED
12. Creating a learner without required fields. -> DENIED

## Security Strategy
We will use a "default deny" rule.
- `allow read`: Currently learners need to find their own profile and see the leaderboard, so public read for most fields is needed, but we should protect the `password` field if we want real privacy.
- `allow write`:
    - `create`: Any sign-in/up can create with `isApproved: false`.
    - `update`: Only via admin or if the user is verified (but we don't have proper Auth yet).
    - `delete`: Only Admin.

Since the user asked for a "password system for privacy", storing passwords in Firestore that are readable by everyone defeats the purpose.
However, without Firebase Auth, secure password checks are hard.
For now, let's keep it simple as requested, but harden it as much as we can.
Actually, the user IS the admin (araizhasan00@gmail.com).

I should probably recommend Firebase Auth for real security, but I will implement rules that at least prevent unauthorized writes.
