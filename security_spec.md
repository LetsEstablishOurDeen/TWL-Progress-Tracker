# Security Specification - The Wisdom Lounge

## Data Invariants
1. A Learner document must be created with `isApproved: false` by default, unless created by an Admin.
2. Only the owner of a Learner document (or an Admin) can read/write their own profile data.
3. EditRequests can be created by any authenticated user (linking to their own learnerId).
4. Only Admins can update the `status` of an EditRequest.
5. Only Admins can read all EditRequests; individual learners can only read their own requests.
6. Identity roles (Owner) are verified against `request.auth.uid`.

## The Dirty Dozen Payloads

1. **Self-Approval Attack**: A learner attempts to update their own `isApproved` field to `true`.
2. **Password Leak Attack**: A learner attempts to read another learner's document.
3. **Identity Spoofing**: A learner submits an EditRequest with a different `learnerId` than their own.
4. **Admin Privilege Escalation**: A learner attempts to write to the `admins` collection.
5. **Request Hijacking**: A learner attempts to approve their own EditRequest by changing `status` to `approved`.
6. **Orphaned Write**: A learner attempts to create an EditRequest for a non-existent learnerId.
7. **Resource Exhaustion**: A learner attempts to write a 1MB string into a `fullName` field.
8. **Shadow Field Injection**: A learner adds secret fields like `isAdmin: true` to their profile.
9. **Terminal State Reversal**: A learner attempts to change a 'rejected' request back to 'pending'.
10. **PII Blanket Read**: An authenticated user tries to list all learners and their personal details.
11. **Spoofed Timestamp**: A learner submits a request with a future `requestedAt`.
12. **ID Poisoning**: A learner uses a 1.5KB junk string as a document ID.

## Test Strategy
All payloads above must return `PERMISSION_DENIED` in the Firestore Security Rules.
