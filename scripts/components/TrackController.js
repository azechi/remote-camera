const template = `
<div>
  {{kind}}: {{readyState}} : {{id}} 
  <button v-if="!ended" v-on:click="toggleEnabled">{{enabled ? "disable" : "enable"}}</button>
  <button v-if="!ended" v-on:click="stop">stop</button>
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
    toggleEnabled() {
      this.$emit("set-enabled", this.id);
    },
    stop() {
      this.$emit("stop", this.id);
    }
  }
};
