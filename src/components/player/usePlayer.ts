import Player, { Popover, Tooltip } from "nplayer";
import Hls from "hls.js";
export function usePlayer() {
	function createIcon(html: string, noCls?: boolean) {
		const div = document.createElement("div");
		div.innerHTML = html;
		if (!noCls) div.classList.add("nplayer_icon");
		return (cls?: string) => {
			if (cls) {
				div.classList.add(cls);
			}
			return div;
		};
	}

	// 镜像开关
	const mirrorSwitch = {
		type: "switch",
		html: "镜像画面",
		checked: false,
		init(player: Player) {
			// 默认不是镜像
			player.video.classList.remove("nplayer_video-mirroring");
		},
		change(value: boolean, player: Player) {
			// 通过添加移除 class 来让视频是否是镜像
			player.video.classList.toggle("nplayer_video-mirroring", value);
		}
	};

	// 倍速选择器
	const speedSelector = {
		el: document.createElement("div"),
		btn: null as unknown as HTMLElement,
		popover: null as unknown as Popover,
		itemElements: null as unknown as HTMLDivElement[],
		value: null as unknown as number,
		tip: "倍速设置",
		tooltip: null as unknown as Tooltip,
		player: null as unknown as Player,
		options: [
			{ value: 2, html: "2x" },
			{ value: 1.5, html: "1.5x" },
			{ value: 1.25, html: "1.25x" },
			{ value: 1, html: "1x" },
			{ value: 0.75, html: "0.75x" },
			{ value: 0.5, html: "0.5x" }
		],
		init(player: Player, _: any, tooltip: Tooltip) {
			this.player = player;
			this.tooltip = tooltip;
			this.btn = document.createElement("div");
			this.btn.textContent = "倍速";
			this.el.appendChild(this.btn);
			this.popover = new Popover(this.el, () => this.tooltip.show());
			this.btn.addEventListener("click", () => {
				this.tooltip.hide();
				this.popover.show();
			});
			// 点击按钮的时候展示 popover
			this.el.style.display = "none";
			// 默认隐藏
			this.el.classList.add("nplayer_selector");
		},
		work() {
			const frag = document.createDocumentFragment();
			const listener = (i: number) => (init: any) => {
				const last = speedSelector.itemElements[speedSelector.itemElements.length - 1];
				const prev = speedSelector.itemElements[speedSelector.value] || last;
				const el = speedSelector.itemElements[i] || last;
				prev.classList.remove("nplayer_selector_item-active");
				el.classList.add("nplayer_selector_item-active");
				speedSelector.btn.textContent = el.textContent;
				if (el.textContent === "1x") speedSelector.btn.textContent = "倍速";
				if (init !== true && !speedSelector.player.paused) setTimeout(() => speedSelector.player.play());
				speedSelector.value = i;
				speedSelector.player.playbackRate = speedSelector.options[i].value;
				speedSelector.popover.hide();
			};
			speedSelector.itemElements = speedSelector.options.map((l, i) => {
				const el = document.createElement("div");
				el.textContent = l.html;
				el.classList.add("nplayer_selector_item");
				el.classList.add("text-center");
				el.addEventListener("click", listener(i));
				frag.appendChild(el);
				return el;
			});
			speedSelector.popover.panelEl.appendChild(frag);
			speedSelector.el.style.display = "block";
			// 初始化为 1 倍速
			listener(3)(true);
		}
	};

	// 清晰度选择器
	// 1. 首先创建一个控制条项
	// 2. 我们把它放到 spacer 后面
	const quantitySelector = {
		el: document.createElement("div"),
		btn: null as unknown as HTMLElement,
		popover: null as unknown as Popover,
		itemElements: null as unknown as HTMLDivElement[],
		value: null as unknown as number,
		tip: "画质设置",
		tooltip: null as unknown as Tooltip,
		player: null as unknown as Player,
		init(player: Player, _: any, tooltip: Tooltip) {
			this.player = player;
			this.tooltip = tooltip;
			this.btn = document.createElement("div");
			this.btn.textContent = "画质";
			this.el.appendChild(this.btn);
			this.popover = new Popover(this.el, () => this.tooltip.show());
			this.btn.addEventListener("click", () => {
				this.tooltip.hide();
				this.popover.show();
			});
			// 点击按钮的时候展示 popover
			this.el.style.display = "none";
			// 默认隐藏
			this.el.classList.add("nplayer_selector");
		},

		work(src: string) {
			// 3. 创建 HLS 实例
			const hls = new Hls();
			hls.on(Hls.Events.MEDIA_ATTACHED, function () {
				hls.on(Hls.Events.MANIFEST_PARSED, function () {
					// 4. 给清晰度排序，清晰度越高的排在最前面
					hls.levels.sort((a, b) => b.height - a.height);
					const frag = document.createDocumentFragment();
					// 5. 给与清晰度对应的元素添加，点击切换清晰度功能
					const listener = (i: number) => (init: any) => {
						const last = quantitySelector.itemElements[quantitySelector.itemElements.length - 1];
						const prev = quantitySelector.itemElements[quantitySelector.value] || last;
						const el = quantitySelector.itemElements[i] || last;
						prev.classList.remove("nplayer_selector_item-active");
						el.classList.add("nplayer_selector_item-active");
						quantitySelector.btn.textContent = el.textContent;
						if (init !== true && !quantitySelector.player.paused) setTimeout(() => quantitySelector.player.play());
						// 因为 HLS 切换清晰度会使正在播放的视频暂停，我们这里让它再自动恢复播放
						quantitySelector.value = hls.currentLevel = hls.loadLevel = i;
						quantitySelector.popover.hide();
					};
					// 6. 添加清晰度对应元素
					quantitySelector.itemElements = hls.levels.map((l, i) => {
						const el = document.createElement("div");
						el.textContent = l.name + "P";
						if (l.height === 1080) el.textContent += " 超清";
						if (l.height === 720) el.textContent += " 高清";
						if (l.height === 480) el.textContent += " 清晰";
						if (l.height === 360) el.textContent += " 流畅";
						el.classList.add("nplayer_selector_item");
						el.addEventListener("click", listener(i));
						frag.appendChild(el);
						return el;
					});

					const el = document.createElement("div");
					el.textContent = "自动";
					el.addEventListener("click", listener(-1));
					el.classList.add("nplayer_selector_item");
					frag.appendChild(el);
					quantitySelector.itemElements.push(el);
					// 这里再添加一个 `自动` 选项，HLS 默认是根据网速自动切换清晰度
					quantitySelector.popover.panelEl.appendChild(frag);
					quantitySelector.el.style.display = "block";
					listener(hls.currentLevel)(true);
					// 初始化当前清晰度
				});

				// 绑定 video 元素成功的时候，去加载视频
				hls.loadSource(src);
			});
			hls.attachMedia(this.player.video);
		}
	};

	const playStatePlugin = {
		el: null as unknown as HTMLDivElement,
		svg: `
      <svg viewBox="0 0 80 80" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <defs>
              <polygon id="cd9e036b-17ed-4fb1-988d-92dd0e62df02" points="0 0 80 0 80 80 0 80"></polygon>
              <path id="e9029cf2-058b-4dc3-a369-191aaec4988d" d="M52.5463795,8.01403034 C54.5470371,7.84763808 56.3253994,9.18911826 56.7676959,11.0911381 C56.8718466,11.5365362 56.8612939,11.8985083 56.8069245,12.2287648 C56.7500316,12.556723 56.6424397,12.8481393 56.4951605,13.110368 C56.4219797,13.2418271 56.3354933,13.3636336 56.2494657,13.4856699 L56.2494657,13.4856699 L55.9916124,13.8522385 L55.4708587,14.5816985 C54.7716265,15.5508645 54.0556475,16.50762 53.3171867,17.4480581 C53.3121398,17.4544931 53.3068634,17.4606984 53.3020459,17.4671334 C54.2015503,17.5075824 55.1010548,17.5517085 56.0005592,17.6022697 C57.096436,17.6624835 58.1918539,17.7339586 59.2877307,17.8093407 L59.2877307,17.8093407 L60.9309723,17.9320665 L61.7527078,17.9980259 L62.1635756,18.0324994 L62.3688948,18.0495064 L62.471669,18.0580098 L62.5872901,18.0699607 C63.8533868,18.1864812 65.1027368,18.520185 66.2644533,19.0451021 C67.4263993,19.5697893 68.5000236,20.2872985 69.4304979,21.1587894 C70.3609723,22.0295909 71.1487556,23.0543742 71.7511781,24.1807396 C72.3552065,25.3059558 72.7702036,26.5343627 72.9750639,27.7944854 C73.0051162,27.9514549 73.0214041,28.1100331 73.0429684,28.2681518 L73.0429684,28.2681518 L73.0581092,28.3867407 L73.0714148,28.4988946 L73.0927497,28.7045867 L73.178089,29.5271253 L73.3366092,31.1733515 C73.4377777,32.2714485 73.5267875,33.3709245 73.6061623,34.4713197 C73.9220556,38.8708323 74.0704819,43.2995325 73.9677076,47.7257047 C73.8695214,52.1475102 73.5717513,56.5518491 73.123949,60.9389512 C73.1124787,61.0662734 73.0904556,61.2356534 73.070956,61.3930826 C73.0530623,61.5521205 73.0269099,61.7104689 72.9989223,61.8683577 L72.9583172,62.1053058 L72.9083065,62.3406451 C72.8745837,62.4976146 72.8410903,62.6543543 72.7979618,62.8092554 C72.638524,63.4309282 72.4281579,64.0401904 72.1691575,64.6280791 C71.6523038,65.8043162 70.9393071,66.8927606 70.0700844,67.8368758 C69.2020087,68.7819103 68.1783951,69.5837648 67.0510896,70.1990025 C65.9240135,70.8153893 64.6934749,71.2433208 63.4282958,71.4609637 C63.2697757,71.485325 63.1117143,71.5129038 62.9525059,71.5331283 L62.9525059,71.5331283 L62.4762572,71.5859877 L61.6545217,71.6574628 L60.0108212,71.7907605 C58.9151739,71.8769444 57.8190677,71.9509475 56.723191,72.0210437 C54.5309786,72.1573291 52.3383075,72.2648865 50.1451775,72.3455546 C41.3733459,72.6696058 32.5989908,72.5652659 23.8315179,72.0442559 C22.7356412,71.9799053 21.6402232,71.9031442 20.5445759,71.8238551 L20.5445759,71.8238551 L18.9015636,71.6951539 L18.0802869,71.6264367 L17.6696486,71.5910438 L17.4643294,71.5731176 C17.3957368,71.5671422 17.3305852,71.5620861 17.2461635,71.5522036 C15.9706611,71.433155 14.7132819,71.091867 13.5460596,70.5609746 C12.3779196,70.0296225 11.3006248,69.3040695 10.368774,68.4252242 C9.4371526,67.5466086 8.64822227,66.5163096 8.04901145,65.3832794 C7.4486536,64.2513983 7.03686821,63.0188545 6.83407251,61.7557442 C6.80952597,61.5978554 6.78268537,61.4401964 6.7670857,61.2811585 L6.7670857,61.2811585 L6.7407039,61.0428314 L6.72762771,60.9240127 L6.71868084,60.8210517 L6.6475647,59.9978237 L6.51565574,58.3504483 C6.43283985,57.2518916 6.35942964,56.1524157 6.29565452,55.0522503 C6.03986583,50.6529675 5.93755035,46.2348392 6.03825998,41.8194687 C6.13667554,37.4068562 6.41012856,33.0075734 6.82604327,28.6223099 C6.94441723,27.3608083 7.26696333,26.1147049 7.78312886,24.9545555 C8.29814735,23.7937167 9.0047206,22.7195213 9.86476706,21.7871271 C10.7243547,20.8542732 11.7390214,20.0655187 12.8543978,19.4603933 C13.9695447,18.8548081 15.1865483,18.43561 16.4368159,18.2241723 C16.5935008,18.2007303 16.7494975,18.1726918 16.9068707,18.1540761 L16.9068707,18.1540761 L17.3762372,18.1030552 L18.1975139,18.0336485 L19.8398379,17.9037982 C20.9350264,17.8199126 22.0302149,17.7482077 23.1254035,17.6801799 C24.2455974,17.6123819 25.3662501,17.552398 26.4866734,17.4993087 C26.4731384,17.4823018 26.459374,17.465065 26.4458389,17.4480581 C25.7073781,16.50762 24.9911698,15.5508645 24.2919376,14.5816985 L24.2919376,14.5816985 L23.7714133,13.8522385 L23.51356,13.4856699 C23.4275324,13.3636336 23.3408166,13.2418271 23.2678652,13.110368 C23.1203565,12.8481393 23.0129941,12.556723 22.9558718,12.2287648 C22.9017318,11.8985083 22.8909496,11.5365362 22.9953298,11.0911381 C23.4527671,9.13281148 25.2740285,7.85039596 27.2166461,8.01403034 C27.6717894,8.05195123 28.0122293,8.1735279 28.3093112,8.32682022 C28.6031814,8.48195113 28.8468116,8.67408363 29.0507543,8.89540373 C29.1530698,9.00548922 29.2418502,9.12568695 29.3313189,9.24519521 L29.3313189,9.24519521 L29.6001838,9.60371998 L30.1328666,10.3244467 C30.8380634,11.289246 31.5265136,12.266226 32.1922524,13.2595235 C32.8575324,14.2532806 33.5042304,15.2605973 34.1217938,16.2890578 C34.3094487,16.6025372 34.4950388,16.9178551 34.6778761,17.2350116 C37.4016243,17.1878978 40.125143,17.1791645 42.8488911,17.1968609 C43.5962988,17.2026065 44.3441653,17.2120293 45.0918023,17.2232906 C45.2723456,16.9100411 45.4558711,16.59886 45.6410025,16.2890578 C46.2587952,15.2605973 46.9054933,14.2532806 47.5707733,13.2595235 C48.2367415,12.266226 48.9249622,11.289246 49.6299296,10.3244467 L49.6299296,10.3244467 L50.1626124,9.60371998 L50.4314773,9.24519521 C50.5211754,9.12568695 50.6099559,9.00548922 50.7122714,8.89540373 C50.9162141,8.67408363 51.1596148,8.48195113 51.4537145,8.32682022 C51.7507964,8.1735279 52.0912362,8.05195123 52.5463795,8.01403034 Z M30.1292787,34.6305448 C29.9027436,35.0737419 29.7609153,35.5553261 29.7110787,36.0505615 C29.4138374,39.0042999 29.2652168,42.0471726 29.2652168,45.1791797 C29.2652168,48.0068864 29.3863609,50.8345931 29.6286492,53.6622998 L29.7399083,54.8741737 C29.9552063,57.072794 31.9120739,58.6805944 34.1106942,58.4652963 C34.6308013,58.4143652 35.1358879,58.2620098 35.597405,58.0168417 C38.4166275,56.5192079 41.1473744,54.9840008 43.7896457,53.4112203 C45.7989419,52.2152106 47.7645435,50.9930278 49.6864507,49.7446716 L51.1196851,48.8034922 C52.9601471,47.5816163 53.4616102,45.0991009 52.2397342,43.2586389 C51.9555036,42.830514 51.5914399,42.4611683 51.1674532,42.1708009 C48.8122631,40.5578484 46.3529939,38.9884709 43.7896457,37.4626684 C41.5302725,36.1178034 39.2374735,34.835025 36.9112487,33.6143333 L35.5115044,32.8893654 C33.5444304,31.8839182 31.1347259,32.6634708 30.1292787,34.6305448 Z"></path>
              <filter x="-15.4%" y="-16.3%" width="130.9%" height="132.5%" filterUnits="objectBoundingBox" id="0bb3e1ae-f6c9-4254-a22a-e753c086e5a8">
                  <feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
                  <feGaussianBlur stdDeviation="1" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur>
                  <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.3 0" type="matrix" in="shadowBlurOuter1" result="shadowMatrixOuter1"></feColorMatrix>
                  <feOffset dx="0" dy="0" in="SourceAlpha" result="shadowOffsetOuter2"></feOffset>
                  <feGaussianBlur stdDeviation="3.5" in="shadowOffsetOuter2" result="shadowBlurOuter2"></feGaussianBlur>
                  <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.2 0" type="matrix" in="shadowBlurOuter2" result="shadowMatrixOuter2"></feColorMatrix>
                  <feMerge>
                      <feMergeNode in="shadowMatrixOuter1"></feMergeNode>
                      <feMergeNode in="shadowMatrixOuter2"></feMergeNode>
                  </feMerge>
              </filter>
          </defs>
          <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" opacity="0.8">
              <mask id="ab6af442-0ec0-4fa1-b1e0-53d5102b9d3a" fill="white">
                  <use xlink:href="#cd9e036b-17ed-4fb1-988d-92dd0e62df02"></use>
              </mask>
              <g mask="url(#ab6af442-0ec0-4fa1-b1e0-53d5102b9d3a)">
                  <use fill="black" fill-opacity="1" filter="url(#0bb3e1ae-f6c9-4254-a22a-e753c086e5a8)" xlink:href="#e9029cf2-058b-4dc3-a369-191aaec4988d"></use>
                  <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#e9029cf2-058b-4dc3-a369-191aaec4988d"></use>
              </g>
          </g>
      </svg>
    `,

		apply(player: Player) {
			const { $ } = player.Player.__utils;
			this.el = player.el.appendChild($(`.state_icon`));
			this.el.innerHTML = this.svg;
			this.el.style.position = "absolute";
			this.el.style.right = "32px";
			this.el.style.bottom = "62px";
			this.el.style.width = "64px";
			this.el.style.height = "64px";

			player.on("Play", () => (this.el.style.display = "none"));
			player.on("Pause", () => (this.el.style.display = "inline"));
			this.el.addEventListener("click", () => {
				player.play();
			});
		}
	};

	return { mirrorSwitch, quantitySelector, speedSelector, createIcon, playStatePlugin };
}
