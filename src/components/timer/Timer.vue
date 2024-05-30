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

	return {
		string: items.map((x) => x.toString().padStart(2, '0')).join(':') ?? UNKNOWN,
		icon: STATUS_ICONS.get(status) || '❔',
		target: formatDate(target) ?? UNKNOWN,
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
    let workday = new Date(date);
    let dayOffset = (date.getDay() % 6 === 0) ? 2 : 1;

    // last workday end
    let lastWorkday = new Date(workday);
    lastWorkday.setDate(workday.getDate() - dayOffset);
    let lastSchedule = getSchedule(lastWorkday);
    let endHour = lastSchedule[lastSchedule.length - 1][1];
    lastWorkday.setHours(endHour, 0, 0, 0);

    // next workday start
    let nextWorkday = new Date(workday);
    nextWorkday.setDate(workday.getDate() + dayOffset);
    let nextSchedule = getSchedule(nextWorkday);
    let startHour = nextSchedule[0][0];
    nextWorkday.setHours(startHour, 0, 0, 0);

    return {
        lastEnd: lastWorkday,
        nextStart: nextWorkday
    };
}


const inSchedule = (date) => {
	const todayHours = getSchedule(date);
	const hour = date.getHours();
	return todayHours.some(([start, end]) => hour >= start && hour < end);
};


const formatDate = (date) => {
	if (!date) return UNKNOWN;
	return date.toLocaleString('es-ES', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
};


const getStatus = () => {
	const date = new Date();

	if (!inSchedule(date)) {
		const { nextStart, lastEnd } = workdayCalculator(date);
		return { target: nextStart, status: 'stop', start: lastEnd };
	}

	date.setSeconds(0, 0);
	let minutes = date.getMinutes();
	if (minutes >= 50) {
		date.setMinutes(0);
		date.setHours(date.getHours() + 1);
	} else {
		date.setMinutes(50);
	}

	return { target: date, status: 'work', start: UNKNOWN }; // TODO: get start time
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
			this.diff = getDateDiff(getStatus());
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
