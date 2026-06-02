# ⚡ Stochastic Smart Grid Load Decision Agent

![Build Status](https://img.shields.io/badge/build-passing-success?style=for-the-badge)
![Python Version](https://img.shields.io/badge/python-3.9%2B-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)
![Framework](https://img.shields.io/badge/framework-Stable--Baselines3-purple?style=for-the-badge)
![Deployment](https://img.shields.io/badge/deployment-WebAssembly-orange?style=for-the-badge)

---

### 🎓 Academic Metadata
- **Author:** Tejaswin Amara
- **Program:** CSIT, KLH University (Bachupally Campus)
- **Academic Standing:** I year III semester
- **Course:** Computational Foundations for Artificial Intelligence
- **Roll Number:** 2520090104

---

## 📖 Executive Summary
The **Stochastic Smart Grid Load Decision Agent** is a deep reinforcement learning physics engine designed to optimize continuous power dispatch within a simulated microgrid. Using a state-of-the-art **Soft Actor-Critic (SAC)** algorithm, this agent autonomously learns to balance battery state-of-charge, maximize financial arbitrage, utilize renewable solar energy, and minimize dynamic thermal degradation. 

By modeling volatile electricity markets and solar generation as Autoregressive AR(1) stochastic processes, the project successfully bridges deep learning theory with highly constrained thermodynamic edge environments.

---

## 🏗️ Key Architectural Innovations

### 1. 8D Lookahead Forecast Horizon
Standard reinforcement learning environments rely on myopic observations (processing only the current time step $t$). This architecture pioneers an **8-Dimensional Lookahead Horizon**, expanding the state-space tensor to include explicit deterministic forecasts for base electricity prices at $t+1, t+2, t+3, \text{ and } t+4$ hours. This allows the actor network to predict peak generation windows and optimize deep-discharge cycles preemptively.

### 2. AR(1) Stochastic Modeling
To simulate the volatility of real-world energy grids, electricity pricing and solar irradiance are modeled as mean-reverting Autoregressive AR(1) processes. The forward transition equation for the pricing grid relies on dynamic drift decay and stochastic shocks:

$$
p_{t+1} = \mu_p + \phi_p(p_t - \mu_p) + \epsilon^p_t
$$

Where:
- $\mu_p$ is the deterministic sinusoidal time-of-day baseline.
- $\phi_p$ is the mean-reverting autocorrelation coefficient.
- $\epsilon^p_t \sim \mathcal{N}(0, \sigma^2)$ represents real-time stochastic grid shocks.

### 3. Production Serialization & State Invariants
Translating PyTorch models from academic training loops to production web environments requires robust serialization. The training pipeline autonomously handles:
- **`VecNormalize` Tracking:** Dynamic observation and reward normalization statistics are explicitly serialized to disk (`vec_normalize.pkl`) and locked during inference to prevent distributional shifting.
- **ONNX Export:** The finalized actor policy network is passed a dummy 8D lookahead tensor and structurally compiled into a computational graph (`best_model.onnx`) for agnostic hardware deployment.
- **Bulletproof Invariants:** Mathematical boundary limits (`np.clip`) physically forbid the State of Charge ($SoC$) from exceeding the hard continuous interval $[0.0, 1.0]$.

### 4. Serverless Edge Deployment
This project operates purely on the client side using **WebAssembly (Wasm)**. Utilizing the `stlite` framework, the entire Python data science stack (NumPy, Plotly, Streamlit, Gymnasium) executes natively within the browser engine without requiring a backend server. This ensures instantaneous latency and free infinite scaling via GitHub Pages.

---

## 📐 Mathematical Reward Shaping

The SAC agent optimizes a composite multi-objective reward function formulated to balance immediate financial gains with long-term infrastructure health:

$$
R_t = \underbrace{-\left(\frac{P_t \cdot \rho_t \cdot \Delta t}{1000}\right) \cdot w_{\text{arb}}}_{\text{Arbitrage Profit}} + \underbrace{\max(0, -P_t \cdot S_t \cdot w_{\text{green}})}_{\text{Green Bonus}} - \underbrace{|P_t| \cdot \Delta t \cdot C_{\text{deg}} \cdot (1 + \lambda(T_{\text{cell}} - T_{\text{nom}})^2) \cdot w_{\text{wear}}}_{\text{Dynamic Thermal Wear Penalty}} - \underbrace{w_{\text{soc}} (SoC_t - 0.5)^2}_{\text{SoC Centering}}
$$

*The agent must maximize profit while strictly managing the non-linear degradation penalty induced by continuous high-amperage heat waste.*

---

## 🚀 Installation & Usage

To reproduce the training physics locally or expand upon the neural architecture:

```bash
# 1. Clone the repository
git clone https://github.com/tejaswin-amara/Smart-Grid-Load-Decision-Agent.git
cd Smart-Grid-Load-Decision-Agent

# 2. Install PyTorch and standard dependencies
pip install -r requirements.txt

# 3. Execute the SAC training loop and compile the ONNX graph
python train.py
```

---

## 🌐 Live Demonstration

Access the zero-latency, serverless interactive WebAssembly dashboard here:

👉 **[Launch Live Serverless Dashboard](https://tejaswin-amara.github.io/Smart-Grid-Load-Decision-Agent/)**
