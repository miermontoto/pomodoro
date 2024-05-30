<script>
	import './Planner.scss';
	export default {
		name: 'PlannerComponent',
		components: {},
		methods: {
			okt() {
				this.$refs.textarea.value = 'okticket';
				this.ack();
			},
			hour() {
				this.ack();
			},
			half() {
				this.ack();
			},
			ack() {

			}
		},
		beforeMount() {this.okt();}
	}
</script>

<template>
	<div class="bar" id="buttons">
		<span class="btn" id="btn_okt">okticket</span>
		<span class="btn" id="btn_60min">60min</span>
		<span class="btn" id="btn_30min">30min</span>
	</div>

	<textarea ref="textarea"></textarea>
</template>
