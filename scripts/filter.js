document.addEventListener("DOMContentLoaded", () => {

  const audio = document.getElementById("audio");
  const button = document.getElementById("button");
  const frequency = document.getElementById("frequency");

  
  const ctx = new AudioContext();
  const src = ctx.createMediaElementSource(audio);
  const bq = ctx.createBiquadFilter();
  
  src.connect(bq);
  bq.connect(ctx.destination);

  bq.type = "lowpass";

  button.addEventListener("click", () => {
    bq.frequency.value = frequency.value || 0;
  })

}, {once: true});
