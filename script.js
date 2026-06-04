/**
 * Project: Stochastic Smart Grid Load Decision Agent
 * Course: Computational Foundations for Artificial Intelligence
 * Author: Tejaswin Amara
 * Roll Number: 2520090104
 * Program: CSIT, KLH University (Bachupally Campus)
 * Academic Standing: I Year (III Semester)
 */

document.addEventListener('DOMContentLoaded', () => {
    // ── SIMULATION CONSTANTS ──────────────────────────────────────
    const BASE_EFFICIENCY     = 0.95;
    const DEGRADATION_COST    = 0.02;  // $/kWh
    const SOC_CENTERING_WEIGHT = 10.0;
    const R_THERMAL           = 0.001; // thermal resistance (deg C / W^2)
    const TAU_THERMAL         = 0.1;   // thermal time constant
    const LAMBDA_WEAR         = 0.005; // temperature wear coefficient

    const WEATHER_MULTIPLIERS = [1.0, 0.4, 0.08]; // SUNNY, CLOUDY, STORMY
    const WEATHER_NAMES       = ["SUNNY", "CLOUDY", "STORMY"];
    const WEATHER_ICONS       = ["☀️", "⛅", "⛈️"];
    const TRANSITION_MATRIX   = [
        [0.75, 0.20, 0.05], // from SUNNY
        [0.25, 0.60, 0.15], // from CLOUDY
        [0.10, 0.35, 0.55]  // from STORMY
    ];

    const TIME_STEP_DURATION  = 1.0;  // 1 hour
    const T_AMB               = 25.0;
    const T_NOMINAL           = 25.0;

    // ── GAUSSIAN NOISE UTILITY ────────────────────────────────────
    function gaussianNoise(mean = 0, std = 1) {
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return mean + std * z0;
    }

    // ── INTERACTIVE SCHEMATIC CLICK HANDLERS ──────────────────────
    function flashCard(cardId) {
        const card = document.getElementById(cardId);
        if (card) {
            card.classList.remove('flash-active');
            void card.offsetWidth; // Force CSS reflow to restart animation
            card.classList.add('flash-active');
            setTimeout(() => {
                card.classList.remove('flash-active');
            }, 1200);
        }
    }

    const nodeSolar = document.getElementById('node-solar');
    const nodeBattery = document.getElementById('node-battery');
    const nodeGrid = document.getElementById('node-grid');

    if (nodeSolar) {
        nodeSolar.addEventListener('click', () => {
            if (!isManualMode) flashCard('metric-profit-card');
            else flashCard('game-player-profit');
        });
    }
    if (nodeBattery) {
        nodeBattery.addEventListener('click', () => {
            if (!isManualMode) flashCard('metric-wear-card');
            else flashCard('game-player-wear');
        });
    }
    if (nodeGrid) {
        nodeGrid.addEventListener('click', () => {
            if (!isManualMode) {
                flashCard('metric-volatility-card');
                flashCard('metric-sharpe-card');
            } else {
                flashCard('game-player-volatility');
                flashCard('game-player-sharpe');
            }
        });
    }

    // ── ELEMENT SELECTORS ─────────────────────────────────────────
    const sliderCapacity = document.getElementById('battery-capacity');
    const sliderCapacityVal = document.getElementById('battery-capacity-val');
    
    const sliderMaxPower = document.getElementById('max-power');
    const sliderMaxPowerVal = document.getElementById('max-power-val');
    
    const sliderVolatility = document.getElementById('price-volatility');
    const sliderVolatilityVal = document.getElementById('price-volatility-val');
    
    const btnRunSimulation = document.getElementById('run-simulation-btn');
    
    const btnSimple = document.getElementById('btn-mode-simple');
    const btnAcademic = document.getElementById('btn-mode-academic');
    
    const presetHome = document.getElementById('preset-home');
    const presetStorm = document.getElementById('preset-storm');
    const presetSolar = document.getElementById('preset-solar');
    
    const elTotalProfit = document.getElementById('total-profit-val');
    const elProfitDelta = document.getElementById('profit-delta-val');
    const elTotalWear = document.getElementById('total-wear-val');
    const elWearDelta = document.getElementById('wear-delta-val');
    const elNetReward = document.getElementById('net-reward-val');
    const elVolatility = document.getElementById('volatility-val');
    const elSharpe = document.getElementById('sharpe-val');
    
    const elSchematicSolar = document.getElementById('schematic-solar-val');
    const elSchematicSoc = document.getElementById('schematic-soc-val');
    const elSchematicGrid = document.getElementById('schematic-grid-val');
    const pathSolar = document.getElementById('flow-solar-bat');
    const pathBatGrid = document.getElementById('flow-bat-grid');

    // ── GLOBAL STATE VARIABLES ────────────────────────────────────
    let batteryCapacity = parseFloat(sliderCapacity.value);
    let maxPower = parseFloat(sliderMaxPower.value);
    let priceVolatility = parseFloat(sliderVolatility.value);
    let isSimpleMode = true;
    let isManualMode = false;

    // Game Mode Trajectory Stores
    let gameStep = 0;
    let gameSocKwh = 50.0;
    let gameCellTemp = 25.0;
    
    let gamePriceSequence = [];
    let gameSolarSequence = [];
    let gameWeatherSequence = [];
    
    let gameTotalProfit = 0.0;
    let gameTotalWear = 0.0;
    let gameCumulativeReward = 0.0;
    
    let gameHistory = {
        hours: [],
        prices: [],
        solarGens: [],
        actions: [],
        socTrajectory: [],
        stepRewards: [],
        profits: [],
        wears: [],
        explainers: [],
        rawExplainers: []
    };
    
    // AI Agent Game calculations
    let aiTotalProfit = 0.0;
    let aiTotalWear = 0.0;
    let aiCumulativeReward = 0.0;
    let aiHistory = {
        socTrajectory: [],
        actions: [],
        profits: [],
        wears: [],
        stepRewards: []
    };

    const LABELS = {
        academic: {
            desc: "Live interactive verification of a Soft Actor-Critic (SAC) reinforcement learning agent optimizing real-time grid energy arbitrage under volatility.",
            profit: "Total Energy Arbitrage Profit",
            wear: "Battery Wear & Degradation Cost",
            reward: "Net Policy Value (Reward)",
            volatility: "Volatility Risk Index",
            sharpe: "Risk-Adjusted Arbitrage (Sharpe)",
            configTitle: "Grid Configuration",
            capacity: "Battery Capacity",
            maxPower: "Max Power Output",
            volatilitySlider: "AR(1) Price Volatility"
        },
        simple: {
            desc: "Simulate how an AI battery agent automatically saves you money on electricity bills by storing cheap solar energy and avoiding peak pricing surges.",
            profit: "Total Electricity Bill Savings",
            wear: "Battery Lifespan Wear Cost",
            reward: "AI Agent Efficiency Score",
            volatility: "Market Price Volatility Rating",
            sharpe: "Savings Consistency Rating",
            configTitle: "Battery Parameters",
            capacity: "Battery Energy Storage Capacity",
            maxPower: "Charging / Discharging Speed",
            volatilitySlider: "Utility Price Volatility"
        }
    };

    function updateDashboardLabels() {
        const mode = isSimpleMode ? 'simple' : 'academic';
        
        document.getElementById('header-desc').innerHTML = LABELS[mode].desc;
        document.getElementById('label-profit').textContent = LABELS[mode].profit;
        document.getElementById('label-wear').textContent = LABELS[mode].wear;
        document.getElementById('label-reward').textContent = LABELS[mode].reward;
        document.getElementById('label-volatility').textContent = LABELS[mode].volatility;
        document.getElementById('label-sharpe').textContent = LABELS[mode].sharpe;
        document.getElementById('sidebar-config-title').textContent = LABELS[mode].configTitle;
        document.getElementById('label-capacity-title').textContent = LABELS[mode].capacity;
        document.getElementById('label-maxpower-title').textContent = LABELS[mode].maxPower;
        document.getElementById('label-volatility-title').textContent = LABELS[mode].volatilitySlider;
    }

    // Input validation on sliders
    sliderCapacity.addEventListener('input', (e) => {
        batteryCapacity = Math.max(50, Math.min(200, parseFloat(e.target.value) || 100));
        sliderCapacityVal.textContent = `${batteryCapacity} kWh`;
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        if (!isManualMode) runStochasticSimulation();
    });

    sliderMaxPower.addEventListener('input', (e) => {
        maxPower = Math.max(10, Math.min(50, parseFloat(e.target.value) || 25));
        sliderMaxPowerVal.textContent = `${maxPower} kW`;
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        if (!isManualMode) runStochasticSimulation();
    });

    sliderVolatility.addEventListener('input', (e) => {
        priceVolatility = Math.max(0.01, Math.min(0.10, parseFloat(e.target.value) || 0.03));
        sliderVolatilityVal.textContent = priceVolatility.toFixed(2);
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        if (!isManualMode) runStochasticSimulation();
    });

    btnRunSimulation.addEventListener('click', () => {
        runStochasticSimulation();
    });

    btnSimple.addEventListener('click', () => {
        isSimpleMode = true;
        btnSimple.classList.add('active');
        btnAcademic.classList.remove('active');
        updateDashboardLabels();
    });
    
    btnAcademic.addEventListener('click', () => {
        isSimpleMode = false;
        btnAcademic.classList.add('active');
        btnSimple.classList.remove('active');
        updateDashboardLabels();
    });

    function setPreset(capacity, power, volatility, activeBtn) {
        sliderCapacity.value = capacity;
        sliderCapacityVal.textContent = `${capacity} kWh`;
        batteryCapacity = capacity;
        
        sliderMaxPower.value = power;
        sliderMaxPowerVal.textContent = `${power} kW`;
        maxPower = power;
        
        sliderVolatility.value = volatility;
        sliderVolatilityVal.textContent = volatility.toFixed(2);
        priceVolatility = volatility;
        
        [presetHome, presetStorm, presetSolar].forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
        
        runStochasticSimulation();
    }
    
    presetHome.addEventListener('click', () => {
        setPreset(100, 25, 0.03, presetHome);
    });
    
    presetStorm.addEventListener('click', () => {
        setPreset(120, 45, 0.08, presetStorm);
    });
    
    presetSolar.addEventListener('click', () => {
        setPreset(80, 15, 0.02, presetSolar);
    });

    // ── TABS WORKSPACE SYSTEM ─────────────────────────────────────
    const tabBtns = document.querySelectorAll('.tab-link');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPanelId = btn.getAttribute('aria-controls');
            
            tabBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            tabPanels.forEach(p => {
                p.style.display = 'none';
                p.classList.remove('active');
            });
            const activePanel = document.getElementById(targetPanelId);
            if (activePanel) {
                activePanel.style.display = 'flex';
                void activePanel.offsetHeight;
                activePanel.classList.add('active');
            }
            
            const presetsPanel = document.getElementById('sidebar-presets-panel');
            const configPanel = document.getElementById('sidebar-config-panel');
            
            if (targetPanelId === 'panel-simulation') {
                isManualMode = false;
                if (presetsPanel) presetsPanel.style.display = 'block';
                if (configPanel) configPanel.style.display = 'block';
                runStochasticSimulation();
            } else if (targetPanelId === 'panel-game') {
                isManualMode = true;
                if (presetsPanel) presetsPanel.style.display = 'none';
                if (configPanel) configPanel.style.display = 'none';
                initGame();
            } else {
                isManualMode = false;
                if (presetsPanel) presetsPanel.style.display = 'none';
                if (configPanel) configPanel.style.display = 'none';
            }
        });
    });

    // ── INTERACTIVE GAME STAGE INITIALIZER ────────────────────────
    function initGame() {
        gameStep = 0;
        gameSocKwh = batteryCapacity / 2.0;
        gameCellTemp = 25.0;
        gameTotalProfit = 0.0;
        gameTotalWear = 0.0;
        gameCumulativeReward = 0.0;
        
        gameHistory = {
            hours: [], prices: [], solarGens: [], actions: [],
            socTrajectory: [], stepRewards: [], profits: [], wears: [],
            explainers: [], rawExplainers: []
        };
        
        gamePriceSequence = [];
        gameSolarSequence = [];
        gameWeatherSequence = [];
        
        const baseProfiles = generateBaseProfiles();
        const basePriceProfile = baseProfiles.prices;
        const baseSolarProfile = baseProfiles.solar;
        
        let weatherState = 0;
        let pNoise = 0.0;
        let sNoise = 0.0;
        
        for (let step = 0; step < 48; step++) {
            const currentHour = step % 24;
            weatherState = stepWeatherMarkov(weatherState);
            const multiplier = WEATHER_MULTIPLIERS[weatherState];
            
            pNoise = 0.8 * pNoise + gaussianNoise(0, priceVolatility);
            sNoise = 0.7 * sNoise + gaussianNoise(0, 2.0);
            pNoise = Math.max(-0.1, Math.min(0.1, pNoise));
            sNoise = Math.max(-10.0, Math.min(10.0, sNoise));
            
            const price = Math.max(0.05, basePriceProfile[currentHour] + pNoise);
            const solar = Math.max(0.0, (baseSolarProfile[currentHour] + sNoise) * multiplier);
            
            gamePriceSequence.push(price);
            gameSolarSequence.push(solar);
            gameWeatherSequence.push({
                icon: WEATHER_ICONS[weatherState],
                name: WEATHER_NAMES[weatherState]
            });
        }
        
        calculateAiAgentResponse();
        updateGameDisplay();
        updateScorecard(0.0, 0.0, 0.0, []);
        displayAiMetrics();
        setGameButtonsState(true);
        
        const gameTableBody = document.querySelector('#game-logs-table tbody');
        if (gameTableBody) gameTableBody.innerHTML = '';
        
        renderGameComparisonCharts();
        updateSchematicVisuals(0.0, 0.0, 50.0, 1.0);
        
        const gameHelpText = document.querySelector('.game-help-text');
        if (gameHelpText) {
            gameHelpText.innerHTML = `Click the buttons below or press keyboard shortcuts <strong>[1 / C]</strong> to Charge, <strong>[2 / S]</strong> for Standby, and <strong>[3 / D]</strong> to Discharge the battery. Try to beat the Soft Actor-Critic (SAC) AI Agent's total savings score!`;
        }
    }

    // ── STOCHASTIC PHYSICS HELPERS (DECOMPOSED) ───────────────────
    function generateBaseProfiles() {
        const prices = [];
        const solar = [];
        for (let h = 0; h < 24; h++) {
            const p = 0.15 + 0.1 * (
                Math.sin(Math.PI * (h - 6) / 12) * (h < 12 ? 1 : 0) +
                Math.sin(Math.PI * (h - 18) / 6) * (h >= 12 ? 1 : 0)
            );
            prices.push(p);
            const s = Math.max(0, 50 * Math.sin(Math.PI * (h - 6) / 12));
            solar.push(s);
        }
        return { prices, solar };
    }

    function stepWeatherMarkov(weatherState) {
        const rand = Math.random();
        let cumulativeProb = 0.0;
        for (let s = 0; s < 3; s++) {
            cumulativeProb += TRANSITION_MATRIX[weatherState][s];
            if (rand <= cumulativeProb) {
                return s;
            }
        }
        return weatherState;
    }

    function applyBatteryPhysics(rawPowerKw, socKwh) {
        const socNorm = socKwh / batteryCapacity;
        let smoothedPowerKw = rawPowerKw;
        if (rawPowerKw > 0) {
            const chargeBoundsFactor = 1.0 - (1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.9))));
            smoothedPowerKw = rawPowerKw * chargeBoundsFactor;
        } else if (rawPowerKw < 0) {
            const dischargeBoundsFactor = 1.0 / (1.0 + Math.exp(-20.0 * (socNorm - 0.1)));
            smoothedPowerKw = rawPowerKw * dischargeBoundsFactor;
        }
        
        const maxCharge = smoothedPowerKw > 0 ? Math.min(smoothedPowerKw, maxPower) : 0;
        const maxDischarge = smoothedPowerKw < 0 ? Math.max(smoothedPowerKw, -maxPower) : 0;
        
        const availableCharge = Math.max(0, batteryCapacity - socKwh);
        const availableDischarge = socKwh;
        
        const actualChargeKw = Math.min(maxCharge, availableCharge / TIME_STEP_DURATION);
        const actualDischargeKw = Math.max(maxDischarge, -availableDischarge / TIME_STEP_DURATION);
        const netPowerKw = actualChargeKw + actualDischargeKw;
        
        const socEfficiency = 1.0 - 0.2 * (socNorm * socNorm);
        const rateFactor = 1.0 - 0.1 * (Math.abs(netPowerKw) / maxPower);
        const efficiency = Math.max(0.7, BASE_EFFICIENCY * socEfficiency * rateFactor);
        
        let newSocKwh = socKwh;
        if (netPowerKw >= 0) {
            newSocKwh = Math.min(batteryCapacity, socKwh + netPowerKw * TIME_STEP_DURATION * efficiency);
        } else {
            newSocKwh = Math.max(0, socKwh - Math.abs(netPowerKw) * TIME_STEP_DURATION / efficiency);
        }
        
        return { netPowerKw, actualChargeKw, actualDischargeKw, newSocKwh, efficiency };
    }

    function computeStepReward(netPowerKw, actualChargeKw, currentPrice, currentSolar, cellTemp) {
        const stepProfit = currentPrice * (-netPowerKw) * TIME_STEP_DURATION;
        const greenBonus = 0.1 * actualChargeKw * currentSolar / 100.0 * TIME_STEP_DURATION;
        
        const powerSquared = netPowerKw * netPowerKw;
        const newCellTemp = T_AMB + R_THERMAL * powerSquared + (1.0 - TAU_THERMAL) * (cellTemp - T_AMB);
        const tempDiff = newCellTemp - T_NOMINAL;
        const dynamicDegradationRate = DEGRADATION_COST * (1.0 + LAMBDA_WEAR * (tempDiff * tempDiff));
        const degradationPenalty = dynamicDegradationRate * Math.abs(netPowerKw) * TIME_STEP_DURATION;
        
        const socNorm = gameSocKwh / batteryCapacity;
        const socPenalty = -SOC_CENTERING_WEIGHT * ((socNorm - 0.5) * (socNorm - 0.5));
        const stepReward = stepProfit + greenBonus - degradationPenalty + socPenalty;
        
        return { stepProfit, greenBonus, degradationPenalty, stepReward, newCellTemp };
    }

    function updateSchematicVisuals(netPowerKw, currentSolar, finalSoc, weatherMultiplier) {
        if (elSchematicSolar) elSchematicSolar.textContent = `${currentSolar.toFixed(1)} kW`;
        if (elSchematicSoc) elSchematicSoc.textContent = `${finalSoc.toFixed(1)}%`;
        
        const batteryLvlVisual = document.getElementById('visual-battery-level');
        const batteryBoltVisual = document.getElementById('visual-battery-bolt');
        if (batteryLvlVisual) {
            batteryLvlVisual.style.width = `${finalSoc.toFixed(0)}%`;
            if (finalSoc < 20.0) {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-red) 0%, var(--color-orange) 100%)';
            } else if (finalSoc < 50.0) {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-orange) 0%, var(--color-primary) 100%)';
            } else {
                batteryLvlVisual.style.background = 'linear-gradient(90deg, var(--color-green) 0%, var(--color-primary) 100%)';
            }
        }
        
        const isCharging = netPowerKw > 0.5;
        if (batteryBoltVisual) {
            batteryBoltVisual.style.display = isCharging ? 'block' : 'none';
        }
        
        let gridStatusText = "Idle / Balanced";
        if (netPowerKw > 0.5) {
            gridStatusText = `Importing: +${netPowerKw.toFixed(1)} kW`;
        } else if (netPowerKw < -0.5) {
            gridStatusText = `Exporting: ${netPowerKw.toFixed(1)} kW`;
        }
        if (elSchematicGrid) elSchematicGrid.textContent = gridStatusText;
        
        // CSS transitions over display swaps
        const isSolarActive = (currentSolar > 2.0);
        if (pathSolar) pathSolar.classList.toggle('flow-active', isSolarActive);
        
        const isDischarging = netPowerKw < -0.5;
        if (pathBatGrid) {
            if (isCharging) {
                pathBatGrid.classList.add('flow-active', 'reverse');
                pathBatGrid.setAttribute('stroke', 'var(--color-green)');
            } else if (isDischarging) {
                pathBatGrid.classList.add('flow-active');
                pathBatGrid.classList.remove('reverse');
                pathBatGrid.setAttribute('stroke', 'var(--color-red)');
            } else {
                pathBatGrid.classList.remove('flow-active', 'reverse');
            }
        }

        const nodeSolar = document.getElementById('node-solar');
        const nodeBattery = document.getElementById('node-battery');
        const nodeGrid = document.getElementById('node-grid');
        if (nodeSolar) nodeSolar.classList.toggle('solar-active', isSolarActive);
        if (nodeBattery) {
            nodeBattery.classList.toggle('charging-active', isCharging);
            nodeBattery.classList.toggle('discharging-active', isDischarging);
        }
        if (nodeGrid) nodeGrid.classList.toggle('solar-active', isCharging || isDischarging);
    }

    // ── DECOMPOSED AI SYSTEM SIMULATOR ────────────────────────────
    function calculateAiAgentResponse() {
        let socKwh = batteryCapacity / 2.0;
        let cellTemp = 25.0;
        aiTotalProfit = 0.0;
        aiTotalWear = 0.0;
        aiCumulativeReward = 0.0;
        
        aiHistory = {
            socTrajectory: [], actions: [], profits: [], wears: [], stepRewards: []
        };
        
        for (let step = 0; step < 48; step++) {
            const currentHour = step % 24;
            const currentPrice = gamePriceSequence[step];
            const currentSolar = gameSolarSequence[step];
            const socNorm = socKwh / batteryCapacity;
            const isPeak = (9 <= currentHour && currentHour <= 12) || (18 <= currentHour && currentHour <= 21);
            
            let action = 0.0;
            if (currentPrice < 0.12 || (currentSolar > 15.0 && socNorm < 0.85)) {
                action = 0.2 + 0.6 * (1.0 - socNorm);
            } else if (isPeak && currentPrice > 0.20 && socNorm > 0.15) {
                action = -0.4 - 0.5 * socNorm;
            } else if (currentPrice > 0.16 && socNorm > 0.3) {
                action = -0.3;
            }
            
            const physics = applyBatteryPhysics(action * maxPower, socKwh);
            socKwh = physics.newSocKwh;
            
            const rewardData = computeStepReward(physics.netPowerKw, physics.actualChargeKw, currentPrice, currentSolar, cellTemp);
            cellTemp = rewardData.newCellTemp;
            
            aiTotalProfit += rewardData.stepProfit;
            aiTotalWear += rewardData.degradationPenalty;
            aiCumulativeReward += rewardData.stepReward;
            
            aiHistory.socTrajectory.push((socKwh / batteryCapacity) * 100);
            aiHistory.actions.push(physics.netPowerKw);
            aiHistory.profits.push(rewardData.stepProfit);
            aiHistory.wears.push(rewardData.degradationPenalty);
            aiHistory.stepRewards.push(rewardData.stepReward);
        }
    }

    function displayAiMetrics() {
        document.getElementById('game-ai-profit').textContent = `$${aiTotalProfit.toFixed(2)}`;
        document.getElementById('game-ai-wear').textContent = `$${aiTotalWear.toFixed(2)}`;
        document.getElementById('game-ai-reward').textContent = aiCumulativeReward.toFixed(2);
        
        if (aiHistory.stepRewards && aiHistory.stepRewards.length > 1) {
            const stats = calculateScorecardStats(aiHistory.stepRewards);
            document.getElementById('game-ai-volatility').textContent = stats.volatility.toFixed(4);
            document.getElementById('game-ai-sharpe').textContent = `${stats.sharpe.toFixed(2)}%`;
        } else {
            document.getElementById('game-ai-volatility').textContent = "0.0000";
            document.getElementById('game-ai-sharpe').textContent = "0.00%";
        }
    }

    function updateGameDisplay() {
        const nextStep = Math.min(47, gameStep);
        const currentPrice = gamePriceSequence[nextStep];
        const currentSolar = gameSolarSequence[nextStep];
        const weather = gameWeatherSequence[nextStep];
        
        document.getElementById('game-step-val').textContent = `Hour ${gameStep}/48`;
        document.getElementById('game-price-val').textContent = `$${currentPrice.toFixed(2)}/kWh`;
        document.getElementById('game-solar-val').textContent = `${currentSolar.toFixed(1)} kW`;
        document.getElementById('game-weather-val').textContent = `${weather.icon} ${weather.name}`;
    }

    // ── GAME STEP EXECUTOR (DECOMPOSED) ───────────────────────────
    function executeGameStep(actionVal) {
        if (gameStep >= 48) return;
        
        const currentHour = gameStep % 24;
        const currentPrice = gamePriceSequence[gameStep];
        const currentSolar = gameSolarSequence[gameStep];
        const weather = gameWeatherSequence[gameStep];
        
        const physics = applyBatteryPhysics(actionVal * maxPower, gameSocKwh);
        gameSocKwh = physics.newSocKwh;
        
        const rewardData = computeStepReward(physics.netPowerKw, physics.actualChargeKw, currentPrice, currentSolar, gameCellTemp);
        gameCellTemp = rewardData.newCellTemp;
        
        gameTotalProfit += rewardData.stepProfit;
        gameTotalWear += rewardData.degradationPenalty;
        gameCumulativeReward += rewardData.stepReward;
        
        const explainer = getDecisionExplainer(actionVal, currentSolar, currentHour);
        const weatherLabel = `${weather.icon} ${weather.name} | ${explainer}`;
        const finalSoc = (gameSocKwh / batteryCapacity) * 100;
        
        saveGameStepHistory(finalSoc, physics.netPowerKw, rewardData.stepReward, rewardData.stepProfit, rewardData.degradationPenalty, weatherLabel, explainer);
        updateScorecard(gameTotalProfit, gameTotalWear, gameCumulativeReward, gameHistory.stepRewards);
        updateSchematicVisuals(physics.netPowerKw, currentSolar, finalSoc, WEATHER_MULTIPLIERS[WEATHER_NAMES.indexOf(weather.name)]);
        appendGameLogTableRow(physics.netPowerKw, finalSoc, currentPrice, currentSolar, rewardData.stepProfit, weatherLabel);
        
        gameStep++;
        updateGameDisplay();
        renderGameComparisonCharts();
        
        if (gameStep >= 48) {
            setGameButtonsState(false);
            highlightWinner();
        }
    }

    function getDecisionExplainer(actionVal, currentSolar, currentHour) {
        if (actionVal > 0) {
            return currentSolar > 15.0 ? "☀️ SOLAR_SURPLUS_CHARGE" : "📉 OFF_PEAK_CHARGE";
        } else if (actionVal < 0) {
            const isPeak = (9 <= currentHour && currentHour <= 12) || (18 <= currentHour && currentHour <= 21);
            return isPeak ? "📈 PEAK_DISCHARGE" : "⚖️ MID_PEAK_DISCHARGE";
        }
        return "💤 IDLE_STANDBY";
    }

    function saveGameStepHistory(finalSoc, netPowerKw, stepReward, stepProfit, degradationPenalty, weatherLabel, explainer) {
        gameHistory.hours.push(gameStep);
        gameHistory.prices.push(gamePriceSequence[gameStep]);
        gameHistory.solarGens.push(gameSolarSequence[gameStep]);
        gameHistory.actions.push(netPowerKw);
        gameHistory.socTrajectory.push(finalSoc);
        gameHistory.stepRewards.push(stepReward);
        gameHistory.profits.push(stepProfit);
        gameHistory.wears.push(degradationPenalty);
        gameHistory.explainers.push(weatherLabel);
        gameHistory.rawExplainers.push(explainer);
    }

    function appendGameLogTableRow(netPowerKw, finalSoc, currentPrice, currentSolar, stepProfit, weatherLabel) {
        const gameTableBody = document.querySelector('#game-logs-table tbody');
        if (!gameTableBody) return;
        
        const aiAction = aiHistory.actions[gameStep];
        const aiSoC = aiHistory.socTrajectory[gameStep];
        const aiProfit = aiHistory.profits[gameStep];
        
        const actionClassPlayer = netPowerKw > 0.5 ? 'tag-off-peak-charge' : netPowerKw < -0.5 ? 'tag-peak-discharge' : 'tag-idle-standby';
        const actionClassAi = aiAction > 0.5 ? 'tag-off-peak-charge' : aiAction < -0.5 ? 'tag-peak-discharge' : 'tag-idle-standby';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>Hour ${gameStep + 1}</td>
            <td>$${currentPrice.toFixed(2)}</td>
            <td>${currentSolar.toFixed(1)} kW</td>
            <td><span class="decision-tag ${actionClassPlayer}">${netPowerKw > 0.5 ? '+' + netPowerKw.toFixed(1) : netPowerKw < -0.5 ? netPowerKw.toFixed(1) : '0.0'} kW</span></td>
            <td>${finalSoc.toFixed(1)}%</td>
            <td><span class="decision-tag ${actionClassAi}">${aiAction > 0.5 ? '+' + aiAction.toFixed(1) : aiAction < -0.5 ? aiAction.toFixed(1) : '0.0'} kW</span></td>
            <td>${aiSoC.toFixed(1)}%</td>
            <td class="${stepProfit >= 0 ? 'metric-delta positive' : 'metric-delta negative'}">${stepProfit >= 0 ? '+$' + stepProfit.toFixed(2) : '-$' + Math.abs(stepProfit).toFixed(2)}</td>
            <td class="${aiProfit >= 0 ? 'metric-delta positive' : 'metric-delta negative'}">${aiProfit >= 0 ? '+$' + aiProfit.toFixed(2) : '-$' + Math.abs(aiProfit).toFixed(2)}</td>
            <td>${weatherLabel}</td>
        `;
        gameTableBody.appendChild(tr);
        
        const tableContainer = gameTableBody.parentElement.parentElement;
        if (tableContainer) {
            tableContainer.scrollTop = tableContainer.scrollHeight;
        }
    }

    function highlightWinner() {
        const playerScore = gameCumulativeReward;
        const aiScore = aiCumulativeReward;
        
        let message = "";
        let themeColor = "";
        if (playerScore > aiScore) {
            message = `🎉 CONGRATULATIONS! You scored ${playerScore.toFixed(2)} and beat the SAC AI Agent (Score: ${aiScore.toFixed(2)})! You are a Smart Grid Master!`;
            themeColor = 'var(--color-green)';
        } else if (playerScore === aiScore) {
            message = `⚖️ IT'S A TIE! Both you and the SAC AI Agent scored ${playerScore.toFixed(2)}! Incredible grid management skills!`;
            themeColor = 'var(--color-primary)';
        } else {
            message = `🤖 SAC AI WINS! The AI Agent scored ${aiScore.toFixed(2)}, beating your score of ${playerScore.toFixed(2)}. Don't worry, SAC agents optimize continuous action spaces with infinite policy iterations. Try again to beat the model!`;
            themeColor = 'var(--color-orange)';
        }
        
        const gameHelpText = document.querySelector('.game-help-text');
        if (gameHelpText) {
            gameHelpText.innerHTML = `<span style="color: ${themeColor}; font-size: 15px; font-weight: 700; display: block; padding: 12px; background: rgba(255,255,255,0.02); border-left: 4px solid ${themeColor}; border-radius: 0 8px 8px 0; margin-bottom: 10px;">${message}</span>`;
        }
    }

    function setGameButtonsState(enabled) {
        document.getElementById('game-btn-charge').disabled = !enabled;
        document.getElementById('game-btn-hold').disabled = !enabled;
        document.getElementById('game-btn-discharge').disabled = !enabled;
    }

    function updateScorecard(profit, wear, reward, stepRewards) {
        if (!isManualMode) {
            elTotalProfit.textContent = `$${profit.toFixed(2)}`;
            elProfitDelta.textContent = `$${(profit / 2.0).toFixed(2)} / day`;
            elTotalWear.textContent = `$${wear.toFixed(2)}`;
            elWearDelta.textContent = `-$${(wear / 2.0).toFixed(2)} / day`;
            elNetReward.textContent = reward.toFixed(2);
            
            if (stepRewards && stepRewards.length > 1) {
                const stats = calculateScorecardStats(stepRewards);
                elVolatility.textContent = stats.volatility.toFixed(4);
                elSharpe.textContent = `${stats.sharpe.toFixed(2)}%`;
            } else {
                elVolatility.textContent = "0.0000";
                elSharpe.textContent = "0.00%";
            }
        } else {
            document.getElementById('game-player-profit').textContent = `$${profit.toFixed(2)}`;
            document.getElementById('game-player-wear').textContent = `$${wear.toFixed(2)}`;
            document.getElementById('game-player-reward').textContent = reward.toFixed(2);
            
            if (stepRewards && stepRewards.length > 1) {
                const stats = calculateScorecardStats(stepRewards);
                document.getElementById('game-player-volatility').textContent = stats.volatility.toFixed(4);
                document.getElementById('game-player-sharpe').textContent = `${stats.sharpe.toFixed(2)}%`;
            } else {
                document.getElementById('game-player-volatility').textContent = "0.0000";
                document.getElementById('game-player-sharpe').textContent = "0.00%";
            }
        }
    }

    function calculateScorecardStats(stepRewards) {
        const count = stepRewards.length;
        let sum = 0.0;
        for (let i = 0; i < count; i++) sum += stepRewards[i];
        const mean = sum / count;
        let varianceSum = 0.0;
        for (let i = 0; i < count; i++) {
            const diff = stepRewards[i] - mean;
            varianceSum += diff * diff;
        }
        const volatility = Math.sqrt(varianceSum / count);
        const sharpe = (mean / (volatility + 1e-6)) * 100.0;
        return { volatility, sharpe };
    }

    document.getElementById('game-btn-charge').addEventListener('click', () => {
        executeGameStep(1.0);
    });
    
    document.getElementById('game-btn-hold').addEventListener('click', () => {
        executeGameStep(0.0);
    });
    
    document.getElementById('game-btn-discharge').addEventListener('click', () => {
        executeGameStep(-1.0);
    });
    
    document.getElementById('game-btn-reset').addEventListener('click', () => {
        initGame();
    });

    // Keyboard bindings
    document.addEventListener('keydown', (e) => {
        if (!isManualMode || gameStep >= 48) return;
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        switch (e.key.toLowerCase()) {
            case '1':
            case 'c':
                e.preventDefault();
                executeGameStep(1.0);
                break;
            case '2':
            case 's':
                e.preventDefault();
                executeGameStep(0.0);
                break;
            case '3':
            case 'd':
                e.preventDefault();
                executeGameStep(-1.0);
                break;
        }
    });

    // ── DECOMPOSED AUTO AI STOCHASTIC SIMULATOR ──────────────────
    function runStochasticSimulation() {
        if (isManualMode) return;
        
        const baseProfiles = generateBaseProfiles();
        const basePriceProfile = baseProfiles.prices;
        const baseSolarProfile = baseProfiles.solar;

        let socKwh = batteryCapacity / 2.0;
        let priceNoise = 0.0;
        let solarNoise = 0.0;
        let weatherState = 0;
        
        const hours = [];
        const prices = [];
        const solarGens = [];
        const actions = [];
        const socTrajectory = [];
        const stepRewards = [];
        const profits = [];
        const wears = [];
        const explainers = [];
        const rawExplainers = [];
        
        let totalProfit = 0.0;
        let totalWear = 0.0;
        let cumulativeReward = 0.0;
        let cellTemp = 25.0;

        for (let step = 0; step < 48; step++) {
            const currentHour = step % 24;
            weatherState = stepWeatherMarkov(weatherState);
            const weatherMultiplier = WEATHER_MULTIPLIERS[weatherState];
            
            priceNoise = 0.8 * priceNoise + gaussianNoise(0, priceVolatility);
            solarNoise = 0.7 * solarNoise + gaussianNoise(0, 2.0);
            priceNoise = Math.max(-0.1, Math.min(0.1, priceNoise));
            solarNoise = Math.max(-10.0, Math.min(10.0, solarNoise));
            
            const currentPrice = Math.max(0.05, basePriceProfile[currentHour] + priceNoise);
            const currentSolar = Math.max(0.0, (baseSolarProfile[currentHour] + solarNoise) * weatherMultiplier);
            const socNorm = socKwh / batteryCapacity;
            const isPeak = (9 <= currentHour && currentHour <= 12) || (18 <= currentHour && currentHour <= 21);
            
            let action = 0.0;
            if (currentPrice < 0.12 || (currentSolar > 15.0 && socNorm < 0.85)) {
                action = 0.2 + 0.6 * (1.0 - socNorm);
            } else if (isPeak && currentPrice > 0.20 && socNorm > 0.15) {
                action = -0.4 - 0.5 * socNorm;
            } else if (currentPrice > 0.16 && socNorm > 0.3) {
                action = -0.3;
            }
            
            const physics = applyBatteryPhysics(action * maxPower, socKwh);
            socKwh = physics.newSocKwh;
            
            const rewardData = computeStepReward(physics.netPowerKw, physics.actualChargeKw, currentPrice, currentSolar, cellTemp);
            cellTemp = rewardData.newCellTemp;
            
            totalProfit += rewardData.stepProfit;
            totalWear += rewardData.degradationPenalty;
            cumulativeReward += rewardData.stepReward;
            
            const explainer = getDecisionExplainer(action, currentSolar, currentHour);
            const weatherLabel = `${WEATHER_ICONS[weatherState]} ${WEATHER_NAMES[weatherState]} | ${explainer}`;
            
            hours.push(step);
            prices.push(currentPrice);
            solarGens.push(currentSolar);
            actions.push(physics.netPowerKw);
            socTrajectory.push((socKwh / batteryCapacity) * 100);
            stepRewards.push(rewardData.stepReward);
            profits.push(rewardData.stepProfit);
            wears.push(rewardData.degradationPenalty);
            explainers.push(weatherLabel);
            rawExplainers.push(explainer);
        }

        updateScorecard(totalProfit, totalWear, cumulativeReward, stepRewards);
        updateSchematicVisuals(actions[47], solarGens[47], socTrajectory[47], WEATHER_MULTIPLIERS[weatherState]);
        renderMarketChart(hours, prices, solarGens, actions);
        renderSocChart(hours, socTrajectory);
        populateSimulationLogsTable(prices, solarGens, actions, socTrajectory, profits, wears, stepRewards, explainers);
    }

    function populateSimulationLogsTable(prices, solarGens, actions, socTrajectory, profits, wears, stepRewards, explainers) {
        const tableBody = document.querySelector('#hourly-logs-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        for (let i = 0; i < 48; i++) {
            const tr = document.createElement('tr');
            const actionClass = actions[i] > 0.5 ? 'tag-off-peak-charge' : actions[i] < -0.5 ? 'tag-peak-discharge' : 'tag-idle-standby';
            tr.innerHTML = `
                <td>Hour ${i + 1}</td>
                <td>$${prices[i].toFixed(2)}</td>
                <td>${solarGens[i].toFixed(1)} kW</td>
                <td><span class="decision-tag ${actionClass}">${actions[i] > 0.5 ? '+' + actions[i].toFixed(1) : actions[i] < -0.5 ? actions[i].toFixed(1) : '0.0'} kW</span></td>
                <td>${socTrajectory[i].toFixed(1)}%</td>
                <td class="${profits[i] >= 0 ? 'metric-delta positive' : 'metric-delta negative'}">${profits[i] >= 0 ? '+$' + profits[i].toFixed(2) : '-$' + Math.abs(profits[i]).toFixed(2)}</td>
                <td class="metric-delta negative">-$${wears[i].toFixed(2)}</td>
                <td>${stepRewards[i].toFixed(2)}</td>
                <td>${explainers[i]}</td>
            `;
            tableBody.appendChild(tr);
        }
    }

    // ── PLOTLY CHART RENDERERS ────────────────────────────────────
    function renderMarketChart(hours, prices, solarGens, actions) {
        const tracePrice = {
            x: hours, y: prices,
            name: 'Electricity Price ($/kWh)',
            type: 'scatter', mode: 'lines',
            line: { color: '#E71D36', width: 2.5 }
        };
        const traceSolar = {
            x: hours, y: solarGens,
            name: 'Solar Output (kW)',
            type: 'scatter', mode: 'lines', fill: 'tozeroy', opacity: 0.15,
            fillcolor: 'rgba(255, 159, 28, 0.25)',
            line: { color: '#FF9F1C', width: 1 },
            yaxis: 'y2'
        };
        const barColors = actions.map(x => x >= 0 ? '#2EC4B6' : '#E71D36');
        const traceDispatch = {
            x: hours, y: actions,
            name: 'Agent Power Flow (kW)',
            type: 'bar', marker: { color: barColors }, opacity: 0.8,
            yaxis: 'y2'
        };
        const layout = {
            title: {
                text: 'Stochastic Market Interface & SAC Agent Power Dispatch Profile',
                font: { family: 'Outfit', size: 16, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', template: 'plotly_dark',
            margin: { t: 60, b: 50, l: 60, r: 60 },
            legend: { orientation: 'h', x: 0.5, y: 1.1, xanchor: 'center' },
            xaxis: {
                title: 'Simulation Time (Hours)', gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear', dtick: 4
            },
            yaxis: {
                title: 'Electricity Price ($/kWh)', color: '#FF4B4B',
                gridcolor: 'rgba(255,255,255,0.05)'
            },
            yaxis2: {
                title: 'Power Flow / Dispatch (kW)', color: '#2EC4B6',
                overlaying: 'y', side: 'right', gridcolor: 'transparent'
            }
        };
        const skeletonMarket = document.getElementById('skeleton-market');
        if (skeletonMarket) skeletonMarket.remove();
        Plotly.newPlot('market-chart', [tracePrice, traceSolar, traceDispatch], layout, { responsive: true, displayModeBar: false });
    }

    function renderSocChart(hours, socTrajectory) {
        const traceSoc = {
            x: hours, y: socTrajectory,
            name: 'State of Charge (%)',
            type: 'scatter', mode: 'lines+markers',
            line: { color: '#3A86C8', width: 3 },
            marker: { color: '#00F5D4', size: 5 }
        };
        const layout = {
            title: {
                text: 'Battery State-of-Charge (SoC) Trajectory Profile',
                font: { family: 'Outfit', size: 16, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', template: 'plotly_dark',
            margin: { t: 60, b: 50, l: 60, r: 40 },
            xaxis: {
                title: 'Simulation Time (Hours)', gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear', dtick: 4
            },
            yaxis: {
                title: 'State-of-Charge (%)', range: [-2, 102],
                gridcolor: 'rgba(255,255,255,0.05)'
            }
        };
        const skeletonSoc = document.getElementById('skeleton-soc');
        if (skeletonSoc) skeletonSoc.remove();
        Plotly.newPlot('soc-chart', [traceSoc], layout, { responsive: true, displayModeBar: false });
    }

    function renderGameComparisonCharts() {
        const tracePlayerSoc = {
            x: gameHistory.hours, y: gameHistory.socTrajectory,
            name: 'Your SoC (%)',
            type: 'scatter', mode: 'lines+markers',
            line: { color: '#00F5D4', width: 3 },
            marker: { color: '#00F5D4', size: 6 }
        };
        const traceAiSoc = {
            x: Array.from({length: 48}, (_, i) => i), y: aiHistory.socTrajectory,
            name: 'AI Agent SoC (%)',
            type: 'scatter', mode: 'lines',
            line: { color: '#7B2CBF', width: 2.5, dash: 'dash' }
        };
        const layoutSoc = {
            title: {
                text: 'SoC Trajectory Comparison: You vs. SAC AI Agent',
                font: { family: 'Outfit', size: 15, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', template: 'plotly_dark',
            margin: { t: 50, b: 40, l: 50, r: 20 },
            legend: { orientation: 'h', x: 0.5, y: 1.15, xanchor: 'center' },
            xaxis: {
                title: 'Hour', gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear', dtick: 4, range: [0, 47]
            },
            yaxis: {
                title: 'State-of-Charge (%)', range: [-5, 105],
                gridcolor: 'rgba(255,255,255,0.05)'
            }
        };
        Plotly.newPlot('game-soc-comparison', [traceAiSoc, tracePlayerSoc], layoutSoc, { responsive: true, displayModeBar: false });
        
        const tracePlayerAction = {
            x: gameHistory.hours, y: gameHistory.actions,
            name: 'Your Dispatch (kW)',
            type: 'bar', marker: { color: 'rgba(0, 245, 212, 0.7)' }
        };
        const traceAiAction = {
            x: Array.from({length: 48}, (_, i) => i), y: aiHistory.actions,
            name: 'AI Agent Dispatch (kW)',
            type: 'bar', marker: { color: 'rgba(123, 44, 191, 0.45)' }
        };
        const layoutAction = {
            title: {
                text: 'Power Dispatch Actions: You vs. SAC AI Agent',
                font: { family: 'Outfit', size: 15, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', template: 'plotly_dark',
            margin: { t: 50, b: 40, l: 50, r: 20 },
            legend: { orientation: 'h', x: 0.5, y: 1.15, xanchor: 'center' },
            barmode: 'group',
            xaxis: {
                title: 'Hour', gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear', dtick: 4, range: [0, 47]
            },
            yaxis: {
                title: 'Power Dispatch (kW)', gridcolor: 'rgba(255,255,255,0.05)'
            }
        };
        Plotly.newPlot('game-action-comparison', [traceAiAction, tracePlayerAction], layoutAction, { responsive: true, displayModeBar: false });
    }

    // ── ACCESSIBILITY & THEME CONTROLS ────────────────────────────
    const btnTextDecrease = document.getElementById('btn-text-decrease');
    const btnTextReset = document.getElementById('btn-text-reset');
    const btnTextIncrease = document.getElementById('btn-text-increase');
    const btnContrastToggle = document.getElementById('btn-contrast-toggle');
    
    btnTextDecrease.addEventListener('click', () => {
        document.body.classList.remove('text-size-lg');
        document.body.classList.add('text-size-sm');
        btnTextDecrease.classList.add('active');
        btnTextReset.classList.remove('active');
        btnTextIncrease.classList.remove('active');
        localStorage.setItem('grid-text-size', 'sm');
    });
    
    btnTextReset.addEventListener('click', () => {
        document.body.classList.remove('text-size-sm', 'text-size-lg');
        btnTextDecrease.classList.remove('active');
        btnTextReset.classList.add('active');
        btnTextIncrease.classList.remove('active');
        localStorage.setItem('grid-text-size', 'md');
    });
    
    btnTextIncrease.addEventListener('click', () => {
        document.body.classList.remove('text-size-sm');
        document.body.classList.add('text-size-lg');
        btnTextDecrease.classList.remove('active');
        btnTextReset.classList.remove('active');
        btnTextIncrease.classList.add('active');
        localStorage.setItem('grid-text-size', 'lg');
    });
    
    btnContrastToggle.addEventListener('click', () => {
        const isContrast = document.body.classList.toggle('high-contrast');
        btnContrastToggle.classList.toggle('active', isContrast);
        localStorage.setItem('grid-high-contrast', isContrast ? 'true' : 'false');
    });
    
    const savedTextSize = localStorage.getItem('grid-text-size');
    if (savedTextSize === 'sm') {
        btnTextDecrease.click();
    } else if (savedTextSize === 'lg') {
        btnTextIncrease.click();
    }
    
    const savedContrast = localStorage.getItem('grid-high-contrast');
    if (savedContrast === 'true') {
        btnContrastToggle.click();
    }

    // ── GUIDED TOUR ONBOARDING STATE MACHINE ──────────────────────
    let tourStep = 0;
    const tourSteps = [
        {
            elementId: 'sidebar-mode-panel',
            title: '🏡 Dashboard Mode',
            description: 'You can switch the entire dashboard between <strong>Simple View</strong> (using natural terms like "bill savings" for laypeople) and <strong>Academic View</strong> (showing raw reinforcement learning terms like MDP variables and policy values).'
        },
        {
            elementId: 'tab-btn-sim',
            title: '📊 Navigation Tabs',
            description: 'Switch between the <strong>Real-Time Simulation</strong>, the <strong>Interactive Game</strong> (where you play against the AI), the <strong>Math reference block</strong>, and the <strong>System Guide</strong>.'
        },
        {
            elementId: 'sidebar-config-panel',
            title: '⚙️ Grid Configuration',
            description: 'Adjust variables like battery storage capacity, charging rates, and pricing volatility, and run new simulations dynamically.'
        },
        {
            elementId: 'node-battery',
            title: '🔌 Live Flow Schematic',
            description: 'This interactive schematic updates in real-time. Connections animate with dash flow speeds mapping energy direction. Click any node to flash highlight its matching KPI card below!'
        },
        {
            elementId: 'tab-btn-game',
            title: '🎮 Test Your Skills!',
            description: 'Ready to try beating the SAC agent? Switch to the <strong>Interactive Grid Game</strong> tab, where you manually charge/discharge the battery hour-by-hour and see how your decisions compare to the AI.'
        }
    ];

    function showTourStep(index) {
        if (index < 0 || index >= tourSteps.length) {
            endTour();
            return;
        }
        tourStep = index;
        const step = tourSteps[index];
        
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });
        
        const targetEl = document.getElementById(step.elementId);
        if (targetEl) {
            targetEl.classList.add('tour-highlight');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        const overlay = document.getElementById('tour-overlay');
        const badge = document.getElementById('tour-badge');
        const title = document.getElementById('tour-title');
        const desc = document.getElementById('tour-description');
        const prevBtn = document.getElementById('tour-prev');
        const nextBtn = document.getElementById('tour-next');
        
        if (overlay) overlay.style.display = 'flex';
        if (badge) badge.textContent = `Step ${index + 1} of ${tourSteps.length}`;
        if (title) title.textContent = step.title;
        if (desc) desc.innerHTML = step.description;
        
        if (prevBtn) prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        if (nextBtn) nextBtn.textContent = index === tourSteps.length - 1 ? 'Finish' : 'Next \u2192';
    }
    
    function endTour() {
        document.getElementById('tour-overlay').style.display = 'none';
        document.querySelectorAll('.tour-highlight').forEach(el => {
            el.classList.remove('tour-highlight');
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    document.getElementById('btn-start-tour').addEventListener('click', () => {
        showTourStep(0);
    });
    
    document.getElementById('tour-prev').addEventListener('click', () => {
        showTourStep(tourStep - 1);
    });
    
    document.getElementById('tour-next').addEventListener('click', () => {
        showTourStep(tourStep + 1);
    });
    
    document.getElementById('tour-close').addEventListener('click', () => {
        endTour();
    });
    
    document.getElementById('tour-overlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('tour-overlay')) {
            endTour();
        }
    });

    updateDashboardLabels();
    runStochasticSimulation();
});
