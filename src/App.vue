<script setup>
	import TimerComponent from '@/components/Timer.vue';
	import MarqueeComponent from '@/components/Marquee.vue';
	import '@/App.scss';
</script>

<template>
	<MarqueeComponent />
	<TimerComponent />

	<div id="footer">
		<a href="https://mier.info">
			<img src="https://mier.info/assets/favicon.svg" id="footer-logo" alt="logo">
		</a>
		<span id="footer-text">
			made
			with <span class="heart">❤</span>
			for <a href="https://okticket.es"><img src="https://mier.info/assets/logos/okticket.png" width="256" height="256" id="oktlogo" alt="okticket"></a>
			by <a href="https://mier.info">Juan Mier</a>
			in <code>Vue.js 3</code>
		</span>
	</div>
</template>
