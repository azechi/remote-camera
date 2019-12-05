const pc = new RTCPeerConnection();

const mediaConstraints= {video: { facingMode:"user", width: 200, height: 200}};
//const mediaConstraints = {audio:true};

const url_offer = "http://192.168.11.10:8080/offer"
const url_answer = "http://192.168.11.10:8080/answer"

const sleep = ms => new Promise(r => setTimeout(r, ms));

const replacer = (_, v) => {
	if (typeof v == 'string') {
		return v.replace(/\r\n/g, "\n");
	}

	return v
}

const reviver = (_, v) => {
	if (typeof v == 'string') {
		return v.replace(/\n/g, "\r\n");
	}

	return v
}

/* main */
(async () => {

	// attach stream
	const ms = await navigator.mediaDevices.getUserMedia(mediaConstraints);
	pc.addTrack(ms.getTracks()[0], ms);
	
	// build SDP
	pc.setLocalDescription(await pc.createOffer());

	const msg = await new Promise(rslv => {

		const f = () => {
			if(pc.iceGatheringState == "complete") {
				pc.removeEventListener("icegatheringstatechange", f);
				rslv(pc.localDescription)
			}
		};

		pc.addEventListener("icegatheringstatechange", f);
	});

	// send SDP
	let res = await fetch(url_offer, {
		mode:"cors",
		method: "POST",
		body: JSON.stringify(msg, replacer),
		headers: {
			"Content-Type": "application/json"
		}
	});


	// polling answer
	let ans;
	while(true){
		const res = await fetch(url_answer, {
			mode:"cors",
			method: "GET"
		});

		if (res.status === 200) {
			ans = await res.text().then(txt => JSON.parse(txt, reviver))
			break
		}

		await sleep(1000);

	}

	pc.setRemoteDescription(ans);


})()
