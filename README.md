# Stochastic Smart Grid Load Decision Agent

**Author:** Tejaswin Amara  
**Affiliation:** Senior III Year, CSIT, KLH University

---

## Abstract

This project presents a **Stochastic Smart Grid Load Decision Agent** that leverages Soft Actor-Critic (SAC) reinforcement learning to optimize energy dispatch decisions in microgrids subject to stochastic demand and renewable variability. The agent operates in a realistic environment characterized by AR(1) correlated noise for renewable generation and non-linear battery charging efficiency curves. By learning a continuous, deterministic policy that balances immediate energy costs with system reliability constraints, the SAC algorithm enables adaptive decision-making under uncertainty. This approach demonstrates superior performance compared to conventional heuristic dispatching strategies in managing peak loads and minimizing operational costs.

---

## Local Training

To train the SAC model locally using PyTorch and Stable-Baselines3:

### Installation

```bash
pip install -r requirements.txt
```

### Training

Execute the training script to learn the optimal policy:

```bash
python train.py
```

**Training Details:**
- **Algorithm:** Soft Actor-Critic (SAC) from Stable-Baselines3
- **Environment:** Custom stochastic microgrid simulator with AR(1) renewable generation noise and non-linear battery dynamics
- **Policy:** Continuous action space for real-time load dispatch
- **Utilities:** PyTorch for deep learning, NumPy for numerical computation, Pandas for data logging

The training script saves the trained SAC model checkpoint for later inference and evaluation.

---

## GitHub Pages Deployment

This project includes a **browser-based interactive dashboard** that runs entirely in the browser without requiring a backend server. 

### Architecture

The web interface leverages:
- **`@stlite/mountable` (WebAssembly):** Compiles the Streamlit application to WebAssembly, enabling full Python execution within the browser
- **Optimized Mathematical Heuristic Policy:** A lightweight, closed-form approximation of the learned SAC continuous manifold policy, designed to execute efficiently in-browser without neural network inference
- **Static Hosting:** The entire application is deployed as static files on GitHub Pages with no server-side dependencies

### Accessing the Dashboard

Visit the GitHub Pages deployment URL to interact with:
- Real-time microgrid state visualization
- Load dispatch recommendations from the heuristic SAC policy surrogate
- Stochastic renewable generation and demand profiles
- Performance metrics and operational statistics

The dashboard dynamically evaluates the heuristic policy against sampled microgrid scenarios, providing instantaneous decision-making without network latency or backend dependencies.

---

## Files

- **`train.py`** – SAC model training script using Stable-Baselines3
- **`app.py`** – Streamlit application for the interactive dashboard
- **`index.html`** – Browser entry point with stlite WebAssembly integration
- **`README.md`** – This documentation file
- **`requirements.txt`** – Python dependencies for local training

---

## Requirements

See `requirements.txt` for complete dependency specifications.

**Core Libraries:**
- `stable-baselines3` – Reinforcement learning algorithms
- `torch` – Deep learning framework
- `numpy` – Numerical computation
- `pandas` – Data manipulation
- `streamlit` – Interactive dashboard framework
- `plotly` – Advanced data visualization

---

## License

This project is provided for educational and research purposes.

---

**For questions or contributions, please open an issue or pull request on GitHub.**
