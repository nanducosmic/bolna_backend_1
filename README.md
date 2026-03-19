## 📝 Documentation for Submission

### 1. The Multi-Tenant Architecture
The system uses a **Shared Database, Separate Schema** approach. Every `Contact`, `Agent`, and `CallLog` is strictly tied to a `tenant_id`. When a user logs in, their JWT contains this ID, and the `protect` middleware ensures they can never access another client's data.

### 2. AI Training Logic
The Agent Training module supports:
- **System Prompts:** Core personality of the AI.
- **Negative Prompts:** Constraints to prevent the AI from off-topic discussion.
- **CTA:** Directives to guide the AI toward the specific goal (Booking/Awareness).

### 3. Google Calendar Integration
Unlike simple integrations, this uses **OAuth2 with Refresh Tokens**. Even if a sub-user isn't logged into the dashboard, the backend can refresh their Google token to book meetings 24/7 as calls are completed.