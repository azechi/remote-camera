const template = `
<div>
  {{kind}}: {{readyState}} : {{id}} 
  <button v-if="!ended" v-on:click="toggleEnabled">{{enabled ? "disable" : "enable"}}</button>
  <button v-if="!ended" v-on:click="stop">stop</button>
  <div>
    <button v-on:click="apply">apply</button>
  </div>
</div>
`;
export default {
  template,
  props: ["id", "enabled", "readyState", "kind"],
  computed: {
    ended() {
      return this.readyState == "ended";
    }
  },
  methods: {
    apply() {
      this.$emit("apply", this.id, { width: 300, frameRate: 20 });
    },
    toggleEnabled() {
      this.$emit("set-enabled", this.id);
    },
    stop() {
      this.$emit("stop", this.id);
    }
  }
};
