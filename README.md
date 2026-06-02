# Stochastic Smart Grid Load Decision Agent

## Author Information
- **Author:** Tejaswin Amara  
- **Program:** CSIT, KLH University (Bachupally Campus)  
- **Academic Standing:** I Year (III Semester)  
- **Roll Number:** 2520090104  

## Abstract
This capstone project develops a production-grade reinforcement learning controller for
microgrid battery dispatch under stochastic electricity prices and solar generation.
The agent is trained using Soft Actor-Critic (SAC) in a continuous action space to
optimize charge/discharge power decisions while balancing market arbitrage, renewable
energy utilization, and battery degradation costs. The system combines a custom
Gymnasium environment, Stable-Baselines3 training pipeline, and a Streamlit dashboard
for interactive policy evaluation.

## Mathematical Formulation
The market price process is modeled with AR(1) dynamics:

\[
p_{t+1} = \mu_p + \phi_p(p_t - \mu_p) + \epsilon^p_t
\]

The SAC objective follows maximum entropy reinforcement learning:

\[
J(\pi) = \sum_{t} \mathbb{E}_{(s_t, a_t) \sim \rho_\pi}
\left[ r(s_t, a_t) + \alpha \mathcal{H}(\pi(\cdot | s_t)) \right]
\]

## Installation
```bash
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Execution
Train the SAC agent:

```bash
python train.py
```

Launch the Streamlit dashboard:

```bash
streamlit run app.py
```