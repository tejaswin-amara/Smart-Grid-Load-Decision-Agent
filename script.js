/**
 * Project: Smart Grid Load Decision Agent - GitHub Pages Logic
 * Course: Computational Foundations for Artificial Intelligence
 * Author: Tejaswin Amara
 * Academic Standing: Senior (III Year)
 * Roll Number: 2520090104
 * Program: CSIT, KLH University (Bachupally Campus)
 */

document.addEventListener('DOMContentLoaded', () => {
    // -------------------------------------------------------------
    // ELEMENT SELECTORS
    // -------------------------------------------------------------
    const sliderCapacity = document.getElementById('battery-capacity');
    const sliderCapacityVal = document.getElementById('battery-capacity-val');
    
    const sliderMaxPower = document.getElementById('max-power');
    const sliderMaxPowerVal = document.getElementById('max-power-val');
    
    const sliderVolatility = document.getElementById('price-volatility');
    const sliderVolatilityVal = document.getElementById('price-volatility-val');
    
    const btnRunSimulation = document.getElementById('run-simulation-btn');
    
    // KPI Cards Elements
    const elTotalProfit = document.getElementById('total-profit-val');
    const elProfitDelta = document.getElementById('profit-delta-val');
    const elTotalWear = document.getElementById('total-wear-val');
    const elWearDelta = document.getElementById('wear-delta-val');
    const elNetReward = document.getElementById('net-reward-val');
    const elVolatility = document.getElementById('volatility-val');
    const elSharpe = document.getElementById('sharpe-val');

    // -------------------------------------------------------------
    // PARAMETERS & SYNC WITH UI
    // -------------------------------------------------------------
    let batteryCapacity = parseFloat(sliderCapacity.value);
    let maxPower = parseFloat(sliderMaxPower.value);
    let priceVolatility = parseFloat(sliderVolatility.value);

    // Event listeners to update label values instantly
    sliderCapacity.addEventListener('input', (e) => {
        batteryCapacity = parseFloat(e.target.value);
        sliderCapacityVal.textContent = `${batteryCapacity} kWh`;
        runStochasticSimulation();
    });

    sliderMaxPower.addEventListener('input', (e) => {
        maxPower = parseFloat(e.target.value);
        sliderMaxPowerVal.textContent = `${maxPower} kW`;
        runStochasticSimulation();
    });

    sliderVolatility.addEventListener('input', (e) => {
        priceVolatility = parseFloat(e.target.value);
        sliderVolatilityVal.textContent = priceVolatility.toFixed(2);
        runStochasticSimulation();
    });

    btnRunSimulation.addEventListener('click', () => {
        runStochasticSimulation();
    });

    // -------------------------------------------------------------
    // STOCHASTIC SIMULATION CORE
    // -------------------------------------------------------------
    function runStochasticSimulation() {
        const timeStepDuration = 1.0; // 1 hour
        const baseEfficiency = 0.95;
        const degradationCostPerKwh = 0.02;
        
        // Setup base profiles
        const basePriceProfile = [];
        const baseSolarProfile = [];
        for (let h = 0; h < 24; h++) {
            // Price curve: peaks morning and evening
            const price = 0.15 + 0.1 * (
                Math.sin(Math.PI * (h - 6) / 12) * (h < 12 ? 1 : 0) +
                Math.sin(Math.PI * (h - 18) / 6) * (h >= 12 ? 1 : 0)
            );
            basePriceProfile.push(price);
            
            // Solar irradiance: normal curve during daytime
            const solar = Math.max(0, 50 * Math.sin(Math.PI * (h - 6) / 12));
            baseSolarProfile.push(solar);
        }

        // Initialize state variables
        let socKwh = batteryCapacity / 2.0; // Start at 50% SoC
        let priceNoise = 0.0;
        let solarNoise = 0.0;
        
        const hours = [];
        const prices = [];
        const solarGens = [];
        const actions = [];
        const socTrajectory = [];
        const stepRewards = [];
        const profits = [];
        const wears = [];
        const explainers = [];
        
        let totalProfit = 0.0;
        let totalWear = 0.0;
        let cumulativeReward = 0.0;

        // Run 48-hour simulation
        for (let step = 0; step < 48; step++) {
            const currentHour = step % 24;
            
            // 1. AR(1) Stochastic update process
            const phiPrice = 0.8;
            const phiSolar = 0.7;
            
            // Box-Muller transform to generate standard normal Gaussian noise
            const u1 = Math.random();
            const u2 = Math.random();
            const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
            
            priceNoise = phiPrice * priceNoise + z0 * priceVolatility;
            solarNoise = phiSolar * solarNoise + z1 * 2.0;
            
            // Bound stochastic noise
            priceNoise = Math.max(-0.1, Math.min(0.1, priceNoise));
            solarNoise = Math.max(-10.0, Math.min(10.0, solarNoise));
            
            const currentPrice = Math.max(0.05, basePriceProfile[currentHour] + priceNoise);
            const currentSolar = Math.max(0.0, baseSolarProfile[currentHour] + solarNoise);
            
            // 2. SAC Actor Heuristic Neural-Network Policy
            // Decision inputs: soc_norm, price_norm, solar_norm, hour
            const socNorm = socKwh / batteryCapacity;
            const isPeak = (9 <= currentHour && currentHour <= 12) || (18 <= currentHour && currentHour <= 21);
            
            let action = 0.0;
            if (currentPrice < 0.12 || (currentSolar > 15.0 && socNorm < 0.85)) {
                // Low price or high solar: charge battery
                action = 0.2 + 0.6 * (1.0 - socNorm);
            } else if (isPeak && currentPrice > 0.20 && socNorm > 0.15) {
                // Peak demand high price: discharge to grid
                action = -0.4 - 0.5 * socNorm;
            } else if (currentPrice > 0.16 && socNorm > 0.3) {
                // Mid peak arbitrage
                action = -0.3;
            }
            
            // 3. Environment Physics and Dynamic Efficiency Constraints
            const rawPowerKw = action * maxPower;
            
            // Feasible bounds matching state limits
            const maxCharge = rawPowerKw > 0 ? Math.min(rawPowerKw, maxPower) : 0;
            const maxDischarge = rawPowerKw < 0 ? Math.max(rawPowerKw, -maxPower) : 0;
            
            const availableCharge = Math.max(0, batteryCapacity - socKwh);
            const availableDischarge = socKwh;
            
            const actualChargeKw = Math.min(maxCharge, availableCharge / timeStepDuration);
            const actualDischargeKw = Math.max(maxDischarge, -availableDischarge / timeStepDuration);
            
            const netPowerKw = actualChargeKw + actualDischargeKw;
            
            // Non-linear efficiency calculus
            const socEfficiency = 1.0 - 0.2 * (socNorm * socNorm);
            const rateFactor = 1.0 - 0.1 * (Math.abs(netPowerKw) / maxPower);
            const efficiency = Math.max(0.7, baseEfficiency * socEfficiency * rateFactor);
            
            // State transitions
            if (netPowerKw >= 0) {
                socKwh = Math.min(batteryCapacity, socKwh + netPowerKw * timeStepDuration * efficiency);
            } else {
                socKwh = Math.max(0, socKwh - Math.abs(netPowerKw) * timeStepDuration / efficiency);
            }
            
            // Multi-objective reward shaping
            const stepProfit = currentPrice * (-netPowerKw) * timeStepDuration;
            const greenBonus = 0.1 * actualChargeKw * currentSolar / 100.0 * timeStepDuration;
            const degradationPenalty = degradationCostPerKwh * Math.abs(netPowerKw) * timeStepDuration;
            
            const stepReward = stepProfit + greenBonus - degradationPenalty;
            
            // Heuristic explanation
            let explainer = "💤 IDLE_STANDBY";
            if (action > 0) {
                if (currentSolar > 15.0) {
                    explainer = "☀️ SOLAR_SURPLUS_CHARGE";
                } else {
                    explainer = "📉 OFF_PEAK_CHARGE";
                }
            } else if (action < 0) {
                if (isPeak) {
                    explainer = "📈 PEAK_DISCHARGE";
                } else {
                    explainer = "⚖️ MID_PEAK_DISCHARGE";
                }
            }
            
            // Accumulate metrics
            totalProfit += stepProfit;
            totalWear += degradationPenalty;
            cumulativeReward += stepReward;
            
            // Record logs
            hours.push(step);
            prices.push(currentPrice);
            solarGens.push(currentSolar);
            actions.push(netPowerKw);
            socTrajectory.push((socKwh / batteryCapacity) * 100);
            stepRewards.push(stepReward);
            profits.push(stepProfit);
            wears.push(degradationPenalty);
            explainers.push(explainer);
        }

        // -------------------------------------------------------------
        // UPDATE METRIC CARDS
        // -------------------------------------------------------------
        elTotalProfit.textContent = `$${totalProfit.toFixed(2)}`;
        elProfitDelta.textContent = `$${(totalProfit / 2.0).toFixed(2)} / day`;
        
        elTotalWear.textContent = `$${totalWear.toFixed(2)}`;
        elWearDelta.textContent = `-$${(totalWear / 2.0).toFixed(2)} / day`;
        
        elNetReward.textContent = cumulativeReward.toFixed(2);

        // Volatility Risk & Sharpe Ratio calculation
        const meanReward = cumulativeReward / 48.0;
        let sumSquaredDiffs = 0.0;
        for (let i = 0; i < 48; i++) {
            const diff = stepRewards[i] - meanReward;
            sumSquaredDiffs += diff * diff;
        }
        const volatilityRisk = Math.sqrt(sumSquaredDiffs / 48.0);
        const sharpeRatio = (meanReward / (volatilityRisk + 1e-6)) * 100.0;

        if (elVolatility) elVolatility.textContent = volatilityRisk.toFixed(4);
        if (elSharpe) elSharpe.textContent = `${sharpeRatio.toFixed(2)}%`;

        // Render detailed hourly logs in the expandable table
        const tableBody = document.querySelector('#hourly-logs-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            for (let i = 0; i < 48; i++) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${hours[i]}h</td>
                    <td>$${(prices[i] * 1000.0).toFixed(2)}</td>
                    <td>${(solarGens[i] * 2.0).toFixed(1)}%</td>
                    <td>${actions[i] >= 0 ? '+' : ''}${actions[i].toFixed(2)} kW</td>
                    <td>${socTrajectory[i].toFixed(1)}%</td>
                    <td>$${profits[i].toFixed(3)}</td>
                    <td>$${wears[i].toFixed(3)}</td>
                    <td>${stepRewards[i].toFixed(3)}</td>
                    <td><span class="decision-tag tag-${explainers[i].toLowerCase().replace(/[^a-z0-9]/g, '-')}">${explainers[i]}</span></td>
                `;
                tableBody.appendChild(tr);
            }
        }

        // -------------------------------------------------------------
        // RENDER INTERACTIVE CHARTS
        // -------------------------------------------------------------
        renderMarketChart(hours, prices, solarGens, actions);
        renderSocChart(hours, socTrajectory);
    }

    // -------------------------------------------------------------
    // PLOTLY CHART BUILDERS
    // -------------------------------------------------------------
    function renderMarketChart(hours, prices, solarGens, actions) {
        const tracePrice = {
            x: hours,
            y: prices,
            name: 'Electricity Price ($/kWh)',
            type: 'scatter',
            mode: 'lines',
            line: { color: '#FF4B4B', width: 3 }
        };

        const traceSolar = {
            x: hours,
            y: solarGens,
            name: 'Solar Power (kW)',
            type: 'scatter',
            fill: 'tozeroy',
            opacity: 0.15,
            fillcolor: 'rgba(255, 159, 28, 0.25)',
            line: { color: '#FF9F1C', width: 1 },
            yaxis: 'y2'
        };

        const barColors = actions.map(x => x >= 0 ? '#2EC4B6' : '#E71D36');
        const traceDispatch = {
            x: hours,
            y: actions,
            name: 'Agent Power Flow (kW)',
            type: 'bar',
            marker: { color: barColors },
            opacity: 0.8,
            yaxis: 'y2'
        };

        const layout = {
            title: {
                text: 'Stochastic Market Interface & SAC Agent Power Dispatch Profile',
                font: { family: 'Outfit', size: 16, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            template: 'plotly_dark',
            margin: { t: 60, b: 50, l: 60, r: 60 },
            legend: { orientation: 'h', x: 0.5, y: 1.1, xanchor: 'center' },
            xaxis: {
                title: 'Simulation Time (Hours)',
                gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear',
                dtick: 4
            },
            yaxis: {
                title: 'Electricity Price ($/kWh)',
                color: '#FF4B4B',
                gridcolor: 'rgba(255,255,255,0.05)'
            },
            yaxis2: {
                title: 'Power Flow / Dispatch (kW)',
                color: '#2EC4B6',
                overlaying: 'y',
                side: 'right',
                gridcolor: 'transparent'
            }
        };

        Plotly.newPlot('market-chart', [tracePrice, traceSolar, traceDispatch], layout, { responsive: true, displayModeBar: false });
    }

    function renderSocChart(hours, socTrajectory) {
        const traceSoc = {
            x: hours,
            y: socTrajectory,
            name: 'State of Charge (%)',
            type: 'scatter',
            mode: 'lines+markers',
            line: { color: '#3A86C8', width: 3 },
            marker: { color: '#00F5D4', size: 5 }
        };

        const layout = {
            title: {
                text: 'Battery State-of-Charge (SoC) Trajectory Profile',
                font: { family: 'Outfit', size: 16, color: '#F3F4F6' }
            },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            template: 'plotly_dark',
            margin: { t: 60, b: 50, l: 60, r: 40 },
            xaxis: {
                title: 'Simulation Time (Hours)',
                gridcolor: 'rgba(255,255,255,0.05)',
                tickmode: 'linear',
                dtick: 4
            },
            yaxis: {
                title: 'State-of-Charge (%)',
                range: [-2, 102],
                gridcolor: 'rgba(255,255,255,0.05)'
            }
        };

        Plotly.newPlot('soc-chart', [traceSoc], layout, { responsive: true, displayModeBar: false });
    }

    // Run initial simulation on load
    runStochasticSimulation();
});
