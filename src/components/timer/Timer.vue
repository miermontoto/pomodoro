<template>
	<div id="timer" class="bar">
		<span id="icon">{{ diff.icon }}</span>
		<span id="countdown" :class="diff.status">{{ diff.string }}</span>
		<br>
	</div>
	<div class="bar">
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

const STATUS_ICONS = new Map([
	['work', '🍅'],
	['stop', '🛑'],
	['coffee', '☕'],
	['jira', '📝'],
	['pause', '⏸️'],
	['daily', '📅'],
]);

const UNKNOWN = '...';

const getDateDiff = (arr) => {
	const now = new Date();
	const { target, status, start } = arr;

	const diff = new Date(target.getTime() - now.getTime());
	const hours = (diff.getHours() - 1) + (diff.getDate() - 1) * 24;
	const minutes = diff.getMinutes();
	const seconds = diff.getSeconds();
	const items = hours === 0 ? [minutes, seconds] : [hours, minutes, seconds];

	const targetIcon = STATUS_ICONS.get(getStatus(target).status) || '❔';
	const targetDate = formatDate(target) ?? UNKNOWN;

	return {
		string: items.map((x) => x.toString().padStart(2, '0')).join(':') ?? UNKNOWN,
		icon: STATUS_ICONS.get(status) || '❔',
		target: `${targetIcon} ${targetDate}`,
		status: status,
		start: formatDate(start) ?? UNKNOWN
	}
};


const getSchedule = (date) => {
	const month = date.getMonth();
	const dayOfWeek = date.getDay();
	if (dayOfWeek === 5) return [[8, 15]];  // viernes
	if (month > 5 && month < 8) return [[8, 15]];  // verano
	return [[9, 14], [16, 18]];
};


function workdayCalculator(date) {
    let today = new Date(date);
    let dayOffset = (date.getDay() % 6 === 0) ? 2 : 1;

    let lastEnd = new Date(today);
    let nextStart = new Date(today);

	// if the schedule for today hasn't started yet, we need to subtract a day
    if (today.getHours() < getSchedule(today)[0][0]) {
		lastEnd.setDate(today.getDate() - dayOffset);
	}
    let lastSchedule = getSchedule(lastEnd);
    let endHour = lastSchedule[lastSchedule.length - 1][1];
    lastEnd.setHours(endHour, 0, 0, 0);

	// if the schedule for today has passed, we need to add a day
	let todaySchedule = getSchedule(today);
	if (today.getHours() >= todaySchedule[lastSchedule.length - 1][1]) {
    	nextStart.setDate(today.getDate() + dayOffset);
	}

    let nextSchedule = getSchedule(nextStart);
    let startHour = nextSchedule[0][0];
    nextStart.setHours(startHour, 0, 0, 0);

    return {
        lastEnd,
        nextStart
    };
}


const inSchedule = (date) => {
	const todayHours = getSchedule(date);
	const hour = date.getHours();
	return todayHours.some(([start, end]) => hour >= start && hour < end);
};


const formatDate = (date) => {
	if (!date) return UNKNOWN;

	// si estamos en el mismo día, devolver solo la hora
	if (date.getDate() === new Date().getDate()) {
		return date.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' });
	}

	return date.toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
};


const getStatus = (date) => {
	const targetDate = new Date();
	const startDate = new Date();

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
			status = 'pause'
		} else if (minutes >= 30) {
			targetDate.setMinutes(55);
			startDate.setMinutes(30);
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
		} else if (hours == 11 && minutes >= 15) {
			startDate.setMinutes(15);
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
		};
	},
	methods: {
		updateDiff() {
			this.diff = getDateDiff(getStatus(new Date()));
			window.document.title = `${this.diff.icon} ${this.diff.string}`;
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
