import fp from "fastify-plugin";
import { Sequelize } from "sequelize";

async function sequelizePlugin(fastify, config) {
  let mysqlStatus = "disconnected";

  // TODO: Connect to MySQL via Sequelize and update the status
  const sequelize = new Sequelize(config.uri, config.options);
  try {
    await sequelize.authenticate();
    fastify.log.info("Connection to MySQL has been established successfully.");
    mysqlStatus = "connected";
    fastify.decorate("sequelize", sequelize);
  } catch (err) {
    fastify.log.error("Unable to connect to the MySQL database:", err);
    throw err;
  }
  fastify.decorate("mysqlStatus", () => mysqlStatus);

  // Graceful shutdown
  fastify.addHook("onClose", async (fastifyInstance, done) => {
    mysqlStatus = "disconnected";
    // TODO: Close Sequelize connection
    await sequelize.close();
    done();
  });
}

export default fp(sequelizePlugin, { name: "sequelize-plugin" });
