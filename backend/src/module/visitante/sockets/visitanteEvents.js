const { getIo } = require("../../socket");

module.exports = {
  created(id, ong_id) {
    const io = getIo();
    io.to("global").emit("visitante:create", { id, ong_id });
  },

  updated(id) {
    const io = getIo();
    io.to("global").emit("visitante:update", { id });
  },

  blocked(data) {
    const io = getIo();
    io.to("global").emit("visitante:block", data);
    io.to("global").emit("visitante:update", data);

    if (data.bloqueado) io.to("global").emit("bloqueio:created", data);
    else
      io.to("global").emit("bloqueio:updated", {
        ...data,
        acao: "desbloqueado",
      });
  },

  deleted(id) {
    const io = getIo();
    io.to("global").emit("visitante:delete", { id });
  },
};
