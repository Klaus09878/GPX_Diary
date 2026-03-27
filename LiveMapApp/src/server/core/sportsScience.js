const DEFAULT_MAX_HR = 190;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function calculateHrZone(timeSeries, maxHr = DEFAULT_MAX_HR) {
    // timeSeries: array of {hr, duration_sec}
    const zones = { z0_sec: 0, z1_sec: 0, z2_sec: 0, z3_sec: 0, z4_sec: 0, z5_sec: 0 };

    for (const point of timeSeries) {
        const hr = Number(point.hr);
        const duration = Number(point.duration_sec) || 0;
        if (!hr || duration <= 0) {
            continue;
        }
        const ratio = clamp(hr / maxHr, 0, 1);

        if (ratio < 0.5) {
            zones.z0_sec += duration;
        } else if (ratio < 0.6) {
            zones.z1_sec += duration;
        } else if (ratio < 0.7) {
            zones.z2_sec += duration;
        } else if (ratio < 0.8) {
            zones.z3_sec += duration;
        } else if (ratio < 0.9) {
            zones.z4_sec += duration;
        } else {
            zones.z5_sec += duration;
        }
    }

    return zones;
}

function calcTrimp({ duration_sec, avg_hr, max_hr = DEFAULT_MAX_HR, resting_hr = 60, gender = 'male' }) {
    const durationMin = Number(duration_sec) / 60;
    if (!durationMin || !avg_hr || !max_hr || max_hr <= resting_hr) {
        return 0;
    }

    const hrRatio = clamp((avg_hr - resting_hr) / (max_hr - resting_hr), 0, 1);
    const y = gender === 'female' ? 0.86 : 0.64;

    const trimp = durationMin * hrRatio * y * Math.exp(1.92 * hrRatio);
    return Number.isFinite(trimp) ? trimp : 0;
}

function calcTssFromTrimp(trimp) {
    const tss = Number(trimp) / 1.8;
    return Number.isFinite(tss) ? tss : 0;
}

function calcTssFromPower({ duration_sec, avg_power, ftp = 250 }) {
    if (!duration_sec || !avg_power || !ftp) {
        return 0;
    }

    return (duration_sec * avg_power * 100) / (ftp * 3600);
}

function calculateEmaSeries(dailyValues = [], period = 7) {
    const alpha = 2 / (period + 1);
    const ema = [];

    let prev = 0;
    for (let i = 0; i < dailyValues.length; i++) {
        const value = Number(dailyValues[i] || 0);

        if (i === 0) {
            prev = value;
        } else {
            prev = prev + alpha * (value - prev);
        }

        ema.push(prev);
    }

    return ema;
}

function calculateAtlCtlTsb({ tssByDate = {} } = {}) {
    const dates = Object.keys(tssByDate).sort();
    const dailyTss = dates.map(d => Number(tssByDate[d] || 0));

    const ctlSeries = calculateEmaSeries(dailyTss, 42);
    const atlSeries = calculateEmaSeries(dailyTss, 7);

    const tsbSeries = [];
    for (let i = 0; i < dates.length; i++) {
        const ctlYesterday = i > 0 ? ctlSeries[i - 1] : 0;
        const atlYesterday = i > 0 ? atlSeries[i - 1] : 0;
        tsbSeries.push(ctlYesterday - atlYesterday);
    }

    return dates.map((date, index) => ({
        date,
        tss: dailyTss[index],
        atl: atlSeries[index],
        ctl: ctlSeries[index],
        tsb: tsbSeries[index]
    }));
}

function categorizeTrainingFocus({ z0_sec = 0, z1_sec = 0, z2_sec = 0, z3_sec = 0, z4_sec = 0, z5_sec = 0 } = {}) {
    const aerob = (z1_sec || 0) + (z2_sec || 0);
    const highAerob = (z3_sec || 0) + (z4_sec || 0);
    const anaerob = z5_sec || 0;
    const total = aerob + highAerob + anaerob + (z0_sec || 0);

    const computePercent = (value) => (total > 0 ? (value / total) * 100 : 0);

    return {
        aerobSec: aerob,
        highAerobSec: highAerob,
        anaerobSec: anaerob,
        aerobPct: computePercent(aerob),
        highAerobPct: computePercent(highAerob),
        anaerobPct: computePercent(anaerob),
        totalSec: total
    };
}

module.exports = {
    calculateHrZone,
    calcTrimp,
    calcTssFromTrimp,
    calcTssFromPower,
    calculateEmaSeries,
    calculateAtlCtlTsb,
    categorizeTrainingFocus
};
