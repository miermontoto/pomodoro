<template>
	<div id="timer" class="bar">
		<span id="icon">{{ diff.icon }}</span>
		<span id="countdown" :class="diff.style">{{ diff.string ? diff.string : '...' }}</span>
		<br>
	</div>
	<div id="info" class="bar">
		<span id="next">Next: {{ formatDate(diff.target) }}</span>
		<!-- <span id="status">Status: {{ diff.test }}</span> -->
	</div>
</template>

<script>
import '@/components/Timer.scss';

const getDateDiff = (date1, date2, inSchedule) => {
	let diff = new Date(date2.getTime() - date1.getTime());
	let hours = diff.getHours() + (diff.getDate() - 1) * 24;
	let minutes = diff.getMinutes();
	let seconds = diff.getSeconds();
	let style = inSchedule ? '' : 'greyeddout';
	let icon = date2.getMinutes() === 0 ? '☕' : '🛠️';
	if (!inSchedule) icon = '🛑';
	return {
		string: [hours, minutes, seconds].map((x) => x.toString().padStart(2, '0')).join(':'),
		icon: icon,
		target: date2,
		style: style,
	}
};

export default {
	name: 'TimerComponent',
	components: {},
	data() {
		return {
			diff: {},
			timer: undefined,
		};
	},
	methods: {
		/**
		 * Devolver el horario de trabajo dependiendo del mes.
		 * Se considera que el horario de verano es de junio a septiembre.
		 * @param {*} date Fecha del horario a devolver
		 * @returns Array con el inicio y fin del horario
		 */
		getSchedule(date) {
			return date.getMonth() < 8 && date.getMonth() > 5 ? [8, 15] : [9, 14];
		},
		/**
		 * Devolver si la fecha está dentro del horario de trabajo.
		 * @param {*} date Fecha a comprobar
		 * @returns true si está en horario, false si no
		 */
		inSchedule(date) {
			let schedule = this.getSchedule(date);
			return date.getHours() >= schedule[0] && date.getHours() < schedule[1];
		},
		/**
		 * Calcular el próximo fin de pomodoro.
		 * Si no está en horario, devolver el próximo inicio de la jornada mediante nextStart().
		 * @returns Fecha del próximo fin de pomodoro
		 */
		nextEnd() {
			let d = new Date();
			if (!this.inSchedule(d)) return this.nextStart(); // Si no está en horario, buscar el próximo inicio

			let nextStop = d.getMinutes() >= 50 ? 0 : 50;
			if (d.getDay() === 5 && d.getHours() === 10) { // tener en cuenta los jiras!
				if (d.getMinutes() >= 45) nextStop = 0;
				else nextStop = 45;
			} else if (d.getHours() === 11) nextStop = 0; // tener en cuenta el descanso del café!

			return new Date(d.getFullYear(), d.getMonth(), d.getDate(), nextStop === 0 ? d.getHours() + 1 : d.getHours(), nextStop);
		},
		/**
		 * Calcular el próximo inicio de jornada.
		 * Si hoy todavía no empezó, devolver el inicio de hoy.
		 * @returns Fecha del próximo inicio de jornada
		 */
		nextStart() {
			let d = new Date();

			// Si hoy todavía no empezó, devolver el inicio de hoy
			if(this.getSchedule(d)[0] > d.getHours()) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), this.getSchedule(d)[0], 0);

			let newDay;
			let newMonth = d.getMonth();
			let newYear = d.getFullYear();

			// Devolver el inicio del próximo día hábil (no se tienen en cuenta fiestas)
			if (d.getDay() === 5) newDay = d.getDate() + 3;
			else if (d.getDay() === 6) newDay = d.getDate() + 2;
			else newDay = d.getDate() + 1;

			if (newDay > new Date(d.getFullYear(), d.getMonth(), 0).getDate()) {
				newDay = 1;
				newMonth += 1;
			}

			if (newMonth > 11) {
				newMonth = 0;
				newYear += 1;
			}

			let targetDate = new Date(newYear, newMonth, newDay);
			return new Date(newYear, newMonth, newDay, this.getSchedule(targetDate)[0], 0);
		},
		getDiff() {
			let nextEnd = this.nextEnd();
			clearInterval(this.timer);
			if (!nextEnd) {
				this.timer = setInterval(this.getDiff, 50000);
				return;
			}
			this.timer = setInterval(this.getDiff, 1000);
			this.diff = getDateDiff(new Date(), nextEnd, this.inSchedule(new Date()));
		},
		formatDate(date) {
			let s = "";
			let d = new Date(date);

			if (isNaN(d.getTime())) return "Loading..."; // if there is no time, the page is still loading

			if (d.getDate() !== new Date().getDate()) {
				s += d.toDateString() + ", ";
			}
			s += d.toTimeString().split(":00 ")[0];

			return s;
		},
	},
	beforeMount() {
		this.timer = setInterval(this.getDiff, 1000);
		this.getDiff();
	},
	beforeUnmount() {
		clearInterval(this.timer);
	},
};
</script>
