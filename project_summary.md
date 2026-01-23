# Nopamine 智商税

### **1. Executive Abstract**

This project is an open-source WeChat Mini Program and Web app designed to function as an external executive control mechanism for financial decision-making. By leveraging psychometric profiling, the application filters impulsive spending urges against a user’s idiosyncratic utility curve. The primary objective is **reputational capital** (GitHub recognition) and **user acquisition** via a low-barrier, free-to-use model supported by ad revenue.

---

### **2. Psychological Framework (The Core Logic)**

The application operationalizes the user's own value definitions to prevent cognitive depletion during purchasing moments (self-affirmation theory).

- **The Construct:** "Stupid Tax" is defined here as the delta between *Perceived Value* (at the moment of impulse) and *Realistic Utility* (long-term satisfaction).
- **Evaluation Dimensions:**
    1. **Instrumental Utility:** Functional necessity (e.g., MPV for client transport).
    2. **Hedonic Validity:** Emotional gratification, adjusted for "status anxiety" and social comparison.
    3. **Budget:** The cost relative to the user's pre-set disposable budget.
- **The Goal:** To shift the user from System 1 thinking (fast, emotional, impulsive) to System 2 thinking (slow, logical, deliberative).

---

### **3. Technical Architecture**

### **A. Stack & Infrastructure**

- **Frontend:** WeChat Mini Program (WXML/WXSS) and mobile app (React Native)
    - For trials: web app (React/Vite)
- **Backend:** Lightweight FastAPI (Python) hosted on a server service (Render).
- **Data Persistence:** Sensitive data (spending habits, income, budget) remains in the user's local device storage after processing. The server acts only as a logic processor.

### **B. Key Modules**

- **`decision_engine`:** The decision-making algorithm. Accepts inputs (Price, Category, Emotion) and returns a verdict (Buy, Wait, Don't Buy) and explanation.
- **`ocr`:** A module recognizing product name, prices, and cart screenshots, circumventing the lack of e-commerce APIs (i.e., Amazon and Taobao).
- **`friction`:** Components designed specifically to slow down users (e.g., cooling-off timers, mandatory reflection prompts).

---

### **4. User Flow & Experience (UX)**

### **Phase I-1: Calibration**

- **Action:** User completes a psychometric onboarding questionnaire.
- **Output:** The app builds a **Value Taxonomy**.
    - *Example:* User A rates "Tech" as High Utility/Low Regret. User B rates "Tech" as Low Utility/High Regret.
    - Also consider time and mental resources being saved if a product is provided with high utility.
- **Result:** Establishment of the "Stupid Threshold" (the markup tolerance for specific categories).

### Phase I-2: Goal setting

- **Action**: User sets a financial goal (e.g., saving, investing).
- **Output**: No output.
- **Result**: The service completes user’s persona with their values and goals.

### **Phase II: The Interception (Real-Time Usage)**

- **Trigger:** User feels the urge to buy.
- **Input (photo or text):**
    - Product name
    - Price
    - Intended usage
    - Justification
- **Processing:** The app cross-references the item against the *Value Taxonomy,* current financial goal, and budget availability.
- **Verdict:**
    - *Green:* Justified (High Utility / Within Budget).
    - *Yellow:* Borderline (Wait 24 hours).
    - *Red:* "Stupid Tax" (Blocks the validation, displays the opportunity cost).

### **Phase III: Reinforcement (The "Tinder" UI)**

- **Action:** Weekly review of past inputs.
- **Interaction:** Swipe Left (Regret) / Swipe Right (Satisfied).
- **Learning:** The `decision-engine` adjusts weights based on this feedback. If "Clothing" is consistently swiped Left, the algorithm increases the resistance for future clothing queries.

---

### **5. Business & Operational Strategy**

- **Monetization:** freemium with limited decisions.
- **Distribution:** WeChat Mini Program + App Store/Google Play + GitHub/Web app.
- **Compliance:**
    - **Content:** Automated filtering of sensitive keywords to ensure Mini Program compliance.

---

### **6. Critical Constraints & Risks**

1. **The Walled Garden:** No direct API access to Taobao/Amazon requires reliance on OCR or manual input, creating high user friction.

---

# **Module Specification: `decision-engine`**

This module functions as the project's **executive control system**. It operationalizes the "Stupid Tax" by converting subjective psychological states and objective financial constraints into a deterministic **Rationality Coefficient (**$\rho$**)**.

The algorithm relies on **Multi-Attribute Utility Theory (MAUT)**, weighing *Instrumental Utility* against *Affective Heuristics* (emotional interference).

---

### **I. The Mathematical Model**

The core objective is to calculate $\rho$ (Rho), which represents the **Justification Score**.

$\rho = \frac{\mathcal{U}_{net} \cdot (1 + \delta_{freq})}{\mathcal{C}_{impact} \cdot (1 + \lambda \cdot \mathcal{E}_{state})}$

### **Variable Definitions:**

1. $\mathcal{U}_{net}$ **(Net Utility):** The baseline value of the item.
    - *Composite:* $(w_1 \cdot \text{Instrumental}) + (w_2 \cdot \text{Hedonic})$
    - *Scale:* 0.0 to 10.0 (Derived from User Taxonomy).
    - *Rationale:* Differentiates between a "Need" (Instrumental) and a "Want" (Hedonic).
2. $\delta_{freq}$ **(Temporal Duration/Frequency):** How often the item interacts with the user's life.
    - *Scale:* 0.0 (One-time use) to 1.0 (Daily use).
    - *Rationale:* Amortizes cost over usage frequency. A $500 coat worn daily has higher $\delta$ than a $500 dress worn annually.
3. $\mathcal{C}_{impact}$ **(Financial Displacement):** The economic weight relative to **disposable** liquidity.
    - *Formula:* $Price / (Budget_{monthly} - Spend_{current})$
    - *Rationale:* Contextualizes price. A $50 coffee is negligible for a millionaire but catastrophic for a student.
    - Cap `financialImpact` or introduce a "Wastefulness" floor. Even if affordable, zero utility should never result in a "Green Light."
4. $\mathcal{E}_{state}$ **(Affective Interference):** The intensity of the immediate emotional urge.
    - *Scale:* 0.0 (Zen/Calm) to 1.0 (Manic/Depressed/Hyped).
    - *Rationale:* Accounts for **"Hot-State" decision making**. High arousal impairs the prefrontal cortex.
    - Consider text analysis to infer user’s accurate emotional state and lying attempts.
5. $\lambda$ **(Impulsivity Constant):** A user-specific multiplier derived from the onboarding quiz.
    - *Range:* 1.0 to 3.0.
    - *Rationale:* Penalizes users who self-identify as historically impulsive.

---

### **II. Decision Logic (The Verdict)**

Once $\rho$ is calculated, it passes through a threshold filter to render a verdict.

| **ρ Score** | **Verdict** | **Action (UI Intervention)** |
| --- | --- | --- |
| $\rho < 1.0$ | **STUPID TAX** | **Hard Block.** Display "Opportunity Cost" (e.g., "This = 10 hours of work"). |
| $1.0 \le \rho < 2.5$ | **COOLING OFF** | **Soft Block.** Enforce a mandatory delay (e.g., "Wait 24h"). Add to "Tinder" queue. |
| $\rho \ge 2.5$ | **JUSTIFIED** | **Pass.** Allow purchase and log for future retrospective. |

---

### **III. Implementation (Pseudocode)**

For your GitHub repository, this logic should be encapsulated in a pure function. This structure demonstrates clean code principles and algorithmic transparency.

```tsx
// decision-engine/calculator.ts

interface PsychContext {
  price: number;           // Item cost
  budgetRemaining: number; // Disposable income left
  utilityScore: number;    // 0-10 (User defined category weight)
  frequencyMod: number;    // 0-1 (Daily=1, Yearly=0.05)
  emotionalState: number;  // 0-1 (0=Calm, 1=High Arousal)
  impulsivityFactor: number; // User calibration (Default 1.5)
}

export enum Verdict {
  STUPID_TAX = "STUPID_TAX",
  COOLING_OFF = "COOLING_OFF",
  JUSTIFIED = "JUSTIFIED"
}

export function calculateRationality(ctx: PsychContext): { score: number, verdict: Verdict } {
  // 1. Safety Check: Prevents divide by zero if budget is blown
  if (ctx.budgetRemaining <= 0) {
    return { score: 0, verdict: Verdict.STUPID_TAX }; 
  }

  // 2. Calculate Financial Impact (Inverse relationship)
  const financialImpact = ctx.price / ctx.budgetRemaining;

  // 3. Calculate Affective Interference (Emotional tax)
  const emotionalPenalty = 1 + (ctx.impulsivityFactor * ctx.emotionalState);

  // 4. Execute The Formula
  // rho = (Utility * (1 + Freq)) / (Impact * Emotion)
  let rho = (ctx.utilityScore * (1 + ctx.frequencyMod)) / 
            (financialImpact * emotionalPenalty);

  // 5. Normalize outliers (Optional capping)
  rho = Math.min(Math.max(rho, 0), 100);

  // 6. Determine Verdict
  let verdict: Verdict;
  if (rho < 1.0) verdict = Verdict.STUPID_TAX;
  else if (rho < 2.5) verdict = Verdict.COOLING_OFF;
  else verdict = Verdict.JUSTIFIED;

  return { score: parseFloat(rho.toFixed(2)), verdict };
}
```

---

### **IV. Critical Analysis of the Algorithm**

1. **Self-Reporting Variance:**
    - *Issue:* Users may lie about `emotionalState` to bypass the block.
    - *Mitigation:* Instead of asking "Are you emotional?", track interaction speed. If the user types/taps frantically (measured in ms), infer High Arousal automatically in the background.