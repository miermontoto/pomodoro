<template>
	<div id="timer" class="bar">
		<span id="icon">{{ diff.icon }}</span>
		<span id="countdown" :class="diff.status">{{ diff.string }}</span>
		<br>
	</div>
	<div class="bar progress-bar"
		:style="{ background: `linear-gradient(to right, #7a7a7a ${progress}%, transparent ${progress}%)` }">
		<span id="info">
			<span id="started">
				<span class="info-left">started:</span>
				<span class="info-right">{{ diff.start }}</span>
			</span>
			<br>
			<span id="next">
				<span class="info-left">next:</span>
				<span class="info-right">{{ diff.target }}</span>
			</span>
		</span>
	</div>
</template>

<script>
import './Timer.scss';
import { getActiveSchedule, scheduleStore, getElapsedMs, sendNotification } from '../../stores/schedule.js';
import { resolveWorkHours } from '../../config/schedules.js';

const STATUS_ICONS = new Map([
	['work', '🍅'],
	['stop', '🛑'],
	['coffee', '☕'],
	['jira', '📝'],
	['pause', '⏸️'],
	['daily', '📅'],
]);


const UNKNOWN = '...';

const getDateDiff = (now, arr) => {
	const { target, status, start, nextStatus } = arr;

	const diff = new Date(target.getTime() - now.getTime());
	const hours = (diff.getHours() - 1) + (diff.getDate() - 1) * 24;
	const minutes = diff.getMinutes();
	const seconds = diff.getSeconds();
	const items = hours === 0 ? [minutes, seconds] : [hours, minutes, seconds];

	// usar nextStatus si está disponible, sino calcular con getStatus
	const nextStatusValue = nextStatus ?? getStatus(target).status;
	const targetIcon = STATUS_ICONS.get(nextStatusValue) || '❔';
	const targetDate = formatDate(target) ?? UNKNOWN;

	return {
		string: items.map((x) => x.toString().padStart(2, '0')).join(':') ?? UNKNOWN,
		icon: STATUS_ICONS.get(status) || '❔',
		target: `${targetIcon} ${targetDate}`,
		status: status,
		start: formatDate(start) ?? UNKNOWN
	}
};


/**
 * Devuelve el horario de trabajo para un día concreto, teniendo en cuenta
 * horario de verano/invierno y viernes.
 * @param {Date} date - fecha de referencia
 * @returns {Array} - [[horaInicio1, horaFin1], [horaInicio2, horaFin2], ...]
 */
const getSchedule = (date) => {
	const month = date.getMonth();
	const dayOfWeek = date.getDay();
	if (dayOfWeek === 5) return [[8, 15]];  // viernes
	if (month > 5 && month < 8) return [[8, 15]];  // verano
	return [[9, 14], [16, 18]];
};


/**
 * Calcula el último fin de jornada y el siguiente inicio de jornada laborable
 * @param {Date} date - fecha de referencia
 * @returns {Object} - { lastEnd: Date, nextStart: Date }
 */
function workdayCalculator(date) {
	let today = new Date(date);
	const day = today.getDay();
	const hours = today.getHours();
	const lastEnd = new Date(today);
	const nextStart = new Date(today);

	const todaySchedule = getSchedule(today);
	const firstHourOfToday = todaySchedule[0][0];
	const lastHourOfToday = todaySchedule[todaySchedule.length - 1][1];
	const isTodayWorkDay = isWorkDay(today);

	// calcular último día laborable
	let lastOffset = 0;
	// si la jornada laboral no ha empezado u hoy no es laborable
	if (firstHourOfToday > hours || !isTodayWorkDay) {
		// if today is monday (1), offset is 3
		// if today is sunday (0), offset is 2
		// in any other case, offset is 1
		switch (day) {
			case 1: lastOffset = 3; break;
			case 0: lastOffset = 2; break;
			default: lastOffset = 1;
		}
	}
	lastEnd.setDate(today.getDate() - lastOffset);

	// calcular siguiente día laborable
	let nextOffset = 0;
	// si la jornada laboral de hoy ya ha terminado u hoy no es laborable
	if (lastHourOfToday <= hours || !isTodayWorkDay) {
		// if today is friday (5), offset is 3
		// if today is saturday (6), offset is 2
		// in any other case, offset is 1
		switch (day) {
			case 5: nextOffset = 3; break;
			case 6: nextOffset = 2; break;
			default: nextOffset = 1;
		}
	}
	nextStart.setDate(today.getDate() + nextOffset);

	// procesar fechas
	const lastSchedule = getSchedule(lastEnd);
	const nextSchedule = getSchedule(nextStart);

	if (lastEnd.getDay() !== day) {
		lastEnd.setHours(lastSchedule[lastSchedule.length - 1][1], 0, 0, 0);
	} else {
		// obtener la última hora de la jornada laboral de hoy.
		// es decir, en el array de horas de hoy,
		// la última hora que sea menor que la hora actual.
		const lastHour = Math.max(...todaySchedule
			.filter(([start, end]) => start <= hours)
			.map(([start, end]) => end));

		lastEnd.setHours(lastHour, 0, 0, 0);
	}

	if (nextStart.getDay() !== day) {
		nextStart.setHours(nextSchedule[0][0], 0, 0, 0);
	} else {
		// ídem que arriba, la siguiente hora es
		// la primera hora mayor que la hora actual.
		const nextHour = Math.min(...todaySchedule
			.filter(([start, end]) => start > hours)
			.map(([start, end]) => start));

		nextStart.setHours(nextHour, 0, 0, 0);
	}

	return { lastEnd, nextStart };
}


/**
 * Comprueba si la fecha dada está dentro del horario laboral de un día concreto.
 * NO tiene en cuenta festivos.
 *
 * @see getSchedule()
 * @param {Date} date - fecha de referencia
 * @returns {boolean} true si está en horario laboral, false en caso contrario
 */
const inSchedule = (date) => {
	const todayHours = getSchedule(date);
	const hour = date.getHours();

	// si es fin de semana, no está en horario
	if (date.getDay() === 0 || date.getDay() === 6) return false;

	return todayHours.some(([start, end]) => hour >= start && hour < end);
};


/**
 * Comprueba si la fecha dada es un día laborable.
 *
 * @param {Date} date - fecha de referencia
 * @returns {boolean} true si es laborable, false en caso contrario
 */
const isWorkDay = (date) => {
	const day = date.getDay();
	return day !== 0 && day !== 6;
};


/**
 * Devuelve la fecha formateada como cadena.
 * Si la fecha es la de hoy, solo se muestra la hora.
 * Si no, se muestra el día de la semana y la hora.
 * Si la fecha es null, se devuelve '...'
 *
 * @param {Date} date - fecha a formatear
 * @returns {string} - fecha formateada
 * @example 'miércoles 12:34', '12:34', '...'
 */
const formatDate = (date) => {
	if (!date) return UNKNOWN;

	// si estamos en el mismo día, devolver solo la hora
	if (date.getDate() === new Date().getDate()) {
		return date.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });
	}

	return date.toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
};


/**
 * Calcula el estado para un pomodoro simple (sin horarios laborales).
 * Usa el tiempo transcurrido desde que el usuario inició el timer.
 *
 * @param {Date} date - fecha de referencia
 * @param {Object} schedule - configuración del schedule
 * @returns {Object} - { target: Date, status: string, start: Date }
 */
const getSimpleStatus = (date, schedule) => {
	// si el timer está detenido, mostrar estado stop
	if (scheduleStore.timerState === 'stopped') {
		return {
			target: date,
			status: 'stop',
			start: date,
			nextStatus: 'stop'
		};
	}

	const { workMinutes, breakMinutes } = schedule;
	const cycleLengthMs = (workMinutes + breakMinutes) * 60 * 1000;
	const workMs = workMinutes * 60 * 1000;

	// usar tiempo transcurrido desde inicio del timer
	const elapsedMs = getElapsedMs();
	const positionInCycleMs = elapsedMs % cycleLengthMs;

	const targetDate = new Date(date);
	const startDate = new Date(date);

	let status, nextStatus;
	if (positionInCycleMs < workMs) {
		// en periodo de trabajo
		status = 'work';
		nextStatus = 'pause';
		const msLeft = workMs - positionInCycleMs;
		targetDate.setTime(date.getTime() + msLeft);
		startDate.setTime(date.getTime() - positionInCycleMs);
	} else {
		// en periodo de pausa
		status = 'pause';
		nextStatus = 'work';
		const pausePositionMs = positionInCycleMs - workMs;
		const breakMs = breakMinutes * 60 * 1000;
		const msLeft = breakMs - pausePositionMs;
		targetDate.setTime(date.getTime() + msLeft);
		startDate.setTime(date.getTime() - pausePositionMs);
	}

	return { target: targetDate, status, start: startDate, nextStatus };
};


/**
 * Comprueba si la hora actual está dentro de los rangos de trabajo.
 * @param {number} hour - hora actual
 * @param {Array} workHours - rangos de horas [[inicio, fin], ...]
 * @returns {boolean}
 */
const isInWorkHours = (hour, workHours) => {
	if (!workHours) return false;
	return workHours.some(([start, end]) => hour >= start && hour < end);
};


/**
 * Calcula el estado para un schedule custom con horarios laborales.
 * Usa ciclos de pomodoro simples basados en el reloj, dentro de las horas definidas.
 *
 * @param {Date} date - fecha de referencia
 * @param {Object} schedule - configuración del schedule
 * @returns {Object} - { target: Date, status: string, start: Date }
 */
const getCustomWorkHoursStatus = (date, schedule) => {
	const { workMinutes, breakMinutes, workHours } = schedule;
	const resolvedHours = resolveWorkHours(workHours, date);
	const hour = date.getHours();

	// si no estamos en horario laboral o es fin de semana
	if (!resolvedHours || !isInWorkHours(hour, resolvedHours) || date.getDay() === 0 || date.getDay() === 6) {
		return {
			target: date,
			status: 'stop',
			start: date,
			nextStatus: 'stop'
		};
	}

	// ciclo simple basado en la hora actual
	const cycleLength = workMinutes + breakMinutes;
	const minutesSinceHour = date.getMinutes();
	const positionInCycle = minutesSinceHour % cycleLength;

	const targetDate = new Date(date);
	const startDate = new Date(date);
	targetDate.setSeconds(0, 0);
	startDate.setSeconds(0, 0);

	let status, nextStatus;
	if (positionInCycle < workMinutes) {
		status = 'work';
		nextStatus = 'pause';
		const minutesLeft = workMinutes - positionInCycle;
		targetDate.setMinutes(date.getMinutes() + minutesLeft);
		startDate.setMinutes(date.getMinutes() - positionInCycle);
	} else {
		status = 'pause';
		nextStatus = 'work';
		const pausePosition = positionInCycle - workMinutes;
		const minutesLeft = breakMinutes - pausePosition;
		targetDate.setMinutes(date.getMinutes() + minutesLeft);
		startDate.setMinutes(date.getMinutes() - pausePosition);
	}

	return { target: targetDate, status, start: startDate, nextStatus };
};


/**
 * Devuelve el estado actual del temporizador, incluyendo la hora de inicio,
 * la hora objetivo y el estado actual.
 * Es la función principal del temporizador.
 *
 * @see workdayCalculator()
 * @param {Date} date - fecha de referencia
 * @returns {Object} - { target: Date, status: string, start: Date }
 */
const getStatus = (date) => {
	const schedule = getActiveSchedule();

	// para schedules sin horarios laborales, usar lógica simple (manual)
	if (!schedule.useWorkHours) {
		return getSimpleStatus(date, schedule);
	}

	// para schedules custom con workHours definido, usar lógica custom
	if (schedule.id === 'custom' && schedule.workHours) {
		return getCustomWorkHoursStatus(date, schedule);
	}

	// lógica de okticket con horarios laborales y eventos especiales
	const targetDate = new Date(date);
	const startDate = new Date(date);

	if (!inSchedule(date)) {
		const { nextStart, lastEnd } = workdayCalculator(date);
		return { target: nextStart, status: 'stop', start: lastEnd };
	}

	// reset seconds to avoid rounding errors
	targetDate.setSeconds(0, 0);
	startDate.setSeconds(0, 0);

	// get info about current time
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const weekday = date.getDay();

	let status = 'work'; // default status is work

	// basic pomodoro rules (50 minutes)
	if (minutes >= 50) {
		targetDate.setMinutes(0);
		targetDate.setHours(hours + 1);
		startDate.setMinutes(50);
		status = 'pause';
	} else {
		targetDate.setMinutes(50);
		startDate.setMinutes(0);
	}

	// daily
	if (hours === getSchedule(date)[0][0]) {
		if (minutes >= 30) {
			targetDate.setHours(hours + 1);
			targetDate.setMinutes(0);
			startDate.setMinutes(30);
			status = 'daily';
		} else if (minutes >= 25) {
			targetDate.setMinutes(30);
			startDate.setMinutes(25);
			status = 'pause';
		} else {
			targetDate.setMinutes(25);
			startDate.setMinutes(0);
		}
	}

	// coffee!
	if (hours === 11 && weekday != 5) {
		if (minutes >= 55) {
			targetDate.setHours(12);
			targetDate.setMinutes(0);
			startDate.setMinutes(55);
			startDate.setHours(11);
			status = 'pause'
		} else if (minutes >= 30) {
			targetDate.setMinutes(55);
			targetDate.setHours(11);
			startDate.setHours(11);
			startDate.setMinutes(30);
			status = 'work';
		} else {
			targetDate.setMinutes(30);
			startDate.setMinutes(0);
			status = 'coffee';
		}
	}

	// jira time
	if (weekday == 5) {
		if (hours == 10) {
			if (minutes >= 45) {
				targetDate.setHours(11);
				targetDate.setMinutes(15);
				startDate.setMinutes(45);
				status = 'jira';
			} else {
				targetDate.setHours(10);
				targetDate.setMinutes(45);
				startDate.setMinutes(0);
			}
		} else if (hours == 11) {
			if (minutes >= 55) {
				targetDate.setHours(12);
				targetDate.setMinutes(0);
				startDate.setMinutes(55);
				status = 'pause';
			} else if (minutes >= 30) {
				targetDate.setHours(11);
				targetDate.setMinutes(55);
				startDate.setMinutes(30);
				status = 'work';
			} else if (minutes >= 15) {
				targetDate.setHours(11);
				targetDate.setMinutes(30);
				startDate.setMinutes(15);
				status = 'pause';
			} else {
				targetDate.setMinutes(15);
				startDate.setHours(10);
				startDate.setMinutes(45);
				status = 'jira';
			}
		}
	}

	return { target: targetDate, status: status, start: startDate };
};


export default {
	name: 'TimerComponent',
	data() {
		return {
			timer: undefined,
			diff: {},
			progress: 0,
		};
	},
	methods: {
		updateDiff() {
			const now = new Date();
			const status = getStatus(now);
			const newDiff = getDateDiff(now, status);

			// solo animar y notificar si el cambio no fue provocado por el usuario
			if (this.diff.status && this.diff.status !== newDiff.status) {
				if (!scheduleStore.userTriggeredChange) {
					this.invertColorsOnStatusChange();
					sendNotification(this.diff.status, newDiff.status);
				}
				scheduleStore.userTriggeredChange = false;
			}

			this.diff = newDiff;
			window.document.title = `${this.diff.icon} ${this.diff.string}`;

			const elapsed = new Date() - status.start;
			this.progress = Math.min(100, (elapsed / (status.target - status.start)) * 100);
		},
		invertColors() {
			document.body.style.filter = 'invert(100%)';
			setTimeout(() => {
				document.body.style.filter = 'none';
			}, 350);
		},
		invertColorsOnStatusChange() {
			let count = 0;
			const intervalId = setInterval(() => {
				this.invertColors();
				count++;
				if (count === 3) {
					clearInterval(intervalId);
				}
			}, 550);
		},
	},
	mounted() {
		this.updateDiff();
		this.timer = setInterval(this.updateDiff, 1000);
	},
	beforeUnmount() {
		clearInterval(this.timer);
	},
};

</script>
