<script>
import { SCHEDULE_PRESETS } from '../config/schedules.js';
import {
	scheduleStore,
	setScheduleById,
	setCustomSchedule,
	getActiveSchedule,
	startTimer,
	pauseTimer,
	resumeTimer,
	stopTimer
} from '../stores/schedule.js';

export default {
	name: 'ScheduleSelector',
	data() {
		return {
			showCustomInput: false,
			customJson: scheduleStore.customJson || this.getDefaultCustomJson(),
			customError: '',
		};
	},
	computed: {
		currentId() {
			return scheduleStore.currentId;
		},
		timerState() {
			return scheduleStore.timerState;
		},
		presets() {
			return Object.values(SCHEDULE_PRESETS);
		},
		activeSchedule() {
			return getActiveSchedule();
		},
		isManualMode() {
			return !this.activeSchedule.useWorkHours;
		},
	},
	methods: {
		getDefaultCustomJson() {
			return JSON.stringify({ workMinutes: 25, breakMinutes: 5 }, null, 2);
		},
		onSelectChange(event) {
			const id = event.target.value;
			if (id === 'custom') {
				this.showCustomInput = true;
			} else {
				this.showCustomInput = false;
				setScheduleById(id);
			}
		},
		applyCustom() {
			const result = setCustomSchedule(this.customJson);
			if (result.success) {
				this.customError = '';
				this.showCustomInput = false;
			} else {
				this.customError = result.error;
			}
		},
		cancelCustom() {
			this.showCustomInput = false;
			this.customJson = scheduleStore.customJson || this.getDefaultCustomJson();
			this.customError = '';
		},
		onStart() {
			startTimer();
		},
		onPause() {
			pauseTimer();
		},
		onResume() {
			resumeTimer();
		},
		onStop() {
			stopTimer();
		},
	},
};
</script>

<template>
	<div class="schedule-controls">
		<div class="controls-row">
			<select :value="currentId" @change="onSelectChange" class="schedule-select">
				<option v-for="preset in presets" :key="preset.id" :value="preset.id">
					{{ preset.name }}
				</option>
				<option value="custom">Custom</option>
			</select>

			<template v-if="isManualMode">
				<button
					v-if="timerState === 'stopped'"
					class="btn control-btn"
					@click="onStart"
				>start</button>
				<button
					v-else-if="timerState === 'running'"
					class="btn control-btn"
					@click="onPause"
				>pause</button>
				<button
					v-else-if="timerState === 'paused'"
					class="btn control-btn"
					@click="onResume"
				>resume</button>
				<button
					v-if="timerState !== 'stopped'"
					class="btn control-btn btn-stop"
					@click="onStop"
				>stop</button>
			</template>
		</div>

		<div v-if="showCustomInput" class="custom-modal">
			<div class="custom-content">
				<h3>custom schedule</h3>
				<div class="help-tooltip">
					<code>workMinutes</code> work duration (1-120)<br>
					<code>breakMinutes</code> break duration (1-60)<br>
					<code>workHours</code> (optional) restricts to hours:<br>
					<span class="help-indent">simple: <code>[[9,14],[16,18]]</code></span><br>
					<span class="help-indent">by day: <code>{"default":[...],"friday":[...]}</code></span><br>
					<span class="help-indent">by month: <code>{"default":[...],"july":[...]}</code></span><br>
					<span class="help-indent">nested: <code>{"july":{"default":[...],"fri":[...]}}</code></span>
				</div>
				<textarea
					v-model="customJson"
					class="custom-textarea"
					rows="6"
					placeholder='{ "workMinutes": 25, "breakMinutes": 5 }'
				></textarea>
				<p v-if="customError" class="custom-error">{{ customError }}</p>
				<div class="custom-actions">
					<button class="btn" @click="applyCustom">apply</button>
					<button class="btn btn-cancel" @click="cancelCustom">cancel</button>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.schedule-controls {
	display: flex;
	justify-content: center;
	margin-top: 1em;
}

.controls-row {
	display: flex;
	gap: 0.5em;
	align-items: center;
}

.schedule-select {
	background: black;
	color: white;
	border: 1px solid #333;
	padding: 0.25em 0.5em;
	font-family: inherit;
	font-size: 0.6em;
	cursor: pointer;

	&:hover {
		border-color: white;
	}
}

.control-btn {
	font-size: 0.6em;
	padding: 0.25em 0.75em;
}

.btn-stop {
	background: #333 !important;
	color: white !important;
	border-color: #333 !important;

	&:hover {
		background: #555 !important;
	}
}

.custom-modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.9);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}

.custom-content {
	background: #1a1a1a;
	padding: 1.5em;
	border: 1px solid #333;
	max-width: 400px;
	width: 90%;

	h3 {
		margin: 0 0 1em 0;
		font-weight: lighter;
		font-size: 0.9em;
	}
}

.help-tooltip {
	background: #252525;
	border: 1px solid #444;
	border-radius: 4px;
	padding: 0.75em;
	margin-bottom: 1em;
	font-size: 0.6em;
	line-height: 1.6;
	color: #aaa;

	code {
		color: #fff;
		background: #333;
		padding: 0.1em 0.3em;
		border-radius: 3px;
		margin-right: 0.3em;
	}

	.help-indent {
		display: inline-block;
		margin-left: 1em;
		color: #888;
	}
}

.custom-textarea {
	width: 100%;
	background: black;
	color: white;
	border: 1px solid #333;
	font-family: monospace;
	font-size: 0.7em;
	padding: 0.5em;
	resize: vertical;
	box-sizing: border-box;
}

.custom-error {
	color: #ff4444;
	font-size: 0.7em;
	margin: 0.5em 0;
}

.custom-actions {
	display: flex;
	gap: 0.5em;
	margin-top: 1em;
}

.btn-cancel {
	background: #333 !important;
	color: white !important;
	border-color: #333 !important;
}
</style>
