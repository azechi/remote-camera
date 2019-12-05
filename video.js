
const video = document.getElementById("video")

const pc = new RTCPeerConnection();

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

pc.ontrack = async e => {
	video.srcObject = e.streams[0];
}

(async () =>{
	let offer;
	while(true){
		const res = await fetch(url_offer, {
			mode:"cors",
			method: "GET"
		});

		if (res.status === 200) {
			offer = await res.text().then(txt => JSON.parse(txt, reviver))
			break
		}

		await sleep(1000);

	}

	pc.setRemoteDescription(offer);

	pc.setLocalDescription(await pc.createAnswer())

	const msg = await new Promise(rslv => {

		const f = () => {
			if(pc.iceGatheringState == "complete") {
				pc.removeEventListener("icegatheringstatechange", f);
				rslv(pc.localDescription)
			}
		};

		pc.addEventListener("icegatheringstatechange", f);
	});

	let res = await fetch(url_answer, {
		mode:"cors",
		method: "POST",
		body: JSON.stringify(msg, replacer),
		headers: {
			"Content-Type": "application/json"
		}
	});
})()

