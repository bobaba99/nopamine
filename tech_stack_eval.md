# Technical Stack Evaluation

This document assesses the functionality asked for in `project_summary.md` and judges whether the chosen stack suits the constraints of each platform. Platform constraints are treated as the primary lens, followed by a functional feasibility check and finally recommendations (including alternatives) where the stack may struggle.

---

## WeChat Mini Program
### Platform Constraints (priority)
- **API Surface and Compliance:** Mini programs run inside a tightly controlled runtime. The restrictions around camera/album usage, background services, and data storage mean real-time OCR and mandatory cooling-off timers must rely on approved APIs and careful user flows; aggressive content (e.g., blocking sentences about purchases) must pass Tencent’s automated review and keyword filters.
- **Limited Native Capabilities:** WXML/WXSS lacks the richer animation and sensor hooks found on native apps; implementing the “Tinder” style weekly review or frictions like cooling-off timers requires manual animation workarounds and timer logic that cannot run when a user leaves the mini program.
- **Size & Performance Caps:** Mini programs have bundle size limits; heavy logic (e.g., OCR models) must be offloaded to the backend or cloud services, while keeping the perceived experience smooth.

### Functionality Evaluation
- **Calibration → Interception → Reinforcement Flow:** The onboarding questionnaire, value taxonomy, and decision verdict flow can be replicated through mini program pages, but capturing user emotion (hot-state) is limited to interaction patterns (tap/swipe speed) and manually entered inputs because access to advanced sensors is constrained.
- **OCR/Manual Input:** There is no native OCR for Taobao/Amazon screenshots. Relying on the provided `ocr` module means either using Tencent’s Cloud OCR APIs (with compliance review) or forcing manual text entry; both create friction but align with the stated fallback.
- **Cool-down Blocks & Explanation:** Mini programs can show modals or custom pages for “hard blocks,” but cannot enforce system-level delays; the cooling-off countdown must run while the app is in the foreground, and users can leave to bypass it.
- **Weekly Tinder Review:** Swipe interactions are implementable but require creative event management; the UI must stay performant within WXML’s capabilities.

### Stack Appropriateness
- **Stack Fit:** Using WXML/WXSS is appropriate for WeChat distribution since it is the only supported language. FastAPI on Render works as the logic processor; the mini program can call the backend over HTTPS for verdict calculations while keeping sensitive data locally.
- **Risks:** Backend latency may hurt real-time interceptions. Mini program size/policy constraints limit optional features like embedded charts or animations.

### Recommendations / Alternatives
1. **Constraint Mitigation:** Use Tencent Cloud OCR (approved for mini programs) combined with a lightweight Relay service to preprocess images before sending results to FastAPI, keeping the mini program bundle lean.
2. **Alternative Stack:** If the constraints become prohibitive, build a dedicated mini program module in the native WX Native component (using WeChat Native SDK) or consider a mini program bridge to a micro-frontend using `WePY` or `Taro` to reuse React-like logic, reducing duplicate work.
3. **Compliance & Timer Workaround:** Implement server-driven timers approved by WeChat (e.g., record last verdict time on the server and enforce 24h logic on future submissions) so the “cooling-off” effect persists even if the user exits the mini program.

---

## React Native Mobile App
### Platform Constraints
- **Hardware & Permissions:** React Native gives access to camera, storage, and sensors through native modules, but each platform (iOS vs Android) has different permission flows, which can slow onboarding and friction enforcement. OCR requires third-party modules (e.g., ML Kit) and careful handling to avoid app store rejection.
- **Background Execution & Timers:** Enforcing mandatory delays while the app is backgrounded is not reliable without native background services; forced friction must rely on local state and in-app reminders, meaning determined users can bypass the cooling-off period.
- **App Store Policies:** Apple’s App Store is sensitive to content that blocks purchases; framing the blocking as a decision-support feature with override options is crucial.
- **Performance/Bundle Size:** React Native’s JS bundle must stay lean; heavy ML on device leads to preload time and battery drain, so OCR should be offloaded to cloud services unless optimized native modules exist.

### Functionality Evaluation
- **Calibration & Goals:** Fully possible via React Native forms and local storage (AsyncStorage or secure storage) for the Value Taxonomy and goals.
- **Interception Flow:** Camera input, manual product entry, and the `decision-engine` call to FastAPI are supported; `friction` components (cooling-off timers, reflection prompts) can use animated modals and native sound/vibration feedback.
- **Weekly Tinder Review:** Swipe libraries (e.g., `react-native-deck-swiper`) handle the reinforcement UI; offline caching allows review even without connectivity.

### Stack Appropriateness
- **Stack Fit:** React Native is suited for cross-platform development and invitations to App Store/Play Store. FastAPI/Render backend is lightweight enough to serve decision logic, and keeping sensitive data local (e.g., AsyncStorage or SecureStore) fits the stated privacy model.
- **Risks:** Cross-platform parity issues and permission handling are the main hurdles. OCR accuracy and battery impact of timers still depend on native modules.

### Recommendations / Alternatives
1. **Constraint Mitigation:** Use platform-specific native modules for OCR (e.g., integrate Google ML Kit on Android and VisionKit on iOS), and handle permissions with clear onboarding flows to reduce friction.
2. **Alternative Stack:** If React Native’s bridge performance or background restrictions prove too limiting, consider Flutter (which offers smoother UI and native performance) or modularizing the decision-engine in native Swift/Kotlin components while keeping the UI in React Native.
3. **Cooling-off Enforcement:** Instead of forcing the user to stay in-app, write the timestamp of the last “cooling-off” verdict to local storage and refuse to re-run the decision for that product until the timer expires, even across sessions.

---

## React/Vite Web App
### Platform Constraints
- **Browser Security Model:** Browsers restrict access to camera and clipboard, preventing low-friction OCR pipelines unless using secure HTTPS-based APIs or user copy-paste. Background timers and blocking interactions are also limited—users can open new tabs or disable scripts.
- **Offline & Persistence:** Web apps can use localStorage/IndexedDB but must handle data loss due to clearing cache or using incognito mode; this undermines the “Value Taxonomy” persistence unless user authentication/sync exists.
- **Ad Blockers / Content Policies:** Since the monetization plan includes ads, the web app must handle ad-blocking behavior which could break revenue assumptions.

### Functionality Evaluation
- **Calibration Flow:** React/Vite can easily build questionnaires and store results in IndexedDB/localStorage; offline support may require service workers if the goal is resilience.
- **Interception Flow:** Manual entry works fine; real-time OCR is harder—browser-based OCR (e.g., Tesseract.js) is possible but heavy and limited by performance constraints. Explanation modals, verdict colors, and countdown timers are straightforward UI work.
- **Reinforcement Flow:** “Tinder” swipe UI is easy to implement with React libraries; however, ensuring offline availability of past entries requires caching strategies.

### Stack Appropriateness
- **Stack Fit:** React/Vite is a good choice for fast iteration and GitHub/Web distribution. FastAPI backend easily serves verdicts. The browser naturally suits weekly reviews and dashboards, but real-time interception that depends on device capabilities (camera) is weaker.
- **Risks:** Browser OCR is limited and may not meet the “interception” promise; caching sensitive data responsibly is also a risk.

### Recommendations / Alternatives
1. **Constraint Mitigation:** Offer a guided manual input flow with optional screenshot upload and server-side OCR (using cloud services) rather than running OCR entirely client-side.
2. **Alternative Stack:** If cross-browser OCR/performance remains unsatisfactory, consider a Progressive Web App (PWA) with service workers for offline persistence, or pair the web front end with a small Electron wrapper to access native capabilities (if distribution allows).
3. **Data Persistence:** Introduce optional user authentication (e.g., OAuth) so preferences can sync via the FastAPI backend, mitigating browser storage volatility while keeping sensitive data encrypted server-side.

---

## Backend & Cross-Platform Considerations
- **FastAPI on Render:** Serves as the central decision-engine endpoint. Given that the business logic is lightweight, this stack fits all platforms as a shared verdict source; use HTTPS, caching, and rate-limiting to keep latency low for real-time interception.
- **Local vs Server Data:** Sensitive data stays on-device; the backend receives inputs and returns verdicts only. Ensure all platforms securely transmit data (TLS, certificate pinning where possible) and consider logging minimal analytics for behavioral tuning without storing personal info.
- **Alternatives:** If synchronous real-time verdicts hinder user flow, deploy the decision logic as a portable JS module (shared across platforms) and run it locally with periodic server sync.

---

## Summary
- **Primary Constraint:** Platform constraints (API surface, permissions, background execution, browser security) shape what is feasible; each platform can meet most functionality with careful design, but OCR and enforced delays require strategic compromises.
- **Stack Fit:** The stated stack generally aligns with each platform’s distribution needs, though the web version might need additional services for persistence and OCR, and the mini program must work within Tencent’s policies.
- **Next Steps:** Experiment with Tencent-approved OCR/resolution strategies, refine React Native native bridges for timers/OCR, and consider cloud OCR + optional authentication for the web app. Evaluate Flutter or native modules if performance or compliance issues persist.