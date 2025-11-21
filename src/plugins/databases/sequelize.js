import fp from "fastify-plugin";
import { Sequelize } from "sequelize";
import { readdir } from "fs/promises";
import { pathToFileURL } from 'url';
import path from "path";

async function sequelizePlugin(fastify, config) {
  let mysqlStatus = "disconnected";

  // TODO: Connect to MySQL via Sequelize and update the status
  const sequelize = new Sequelize(config.uri, config.options);
  try {
    await sequelize.authenticate();
    fastify.log.info("Connection to MySQL has been established successfully.");
    mysqlStatus = "connected";
    fastify.decorate("sequelize", sequelize);

    // Deal with models
    const models = {};
    const modelPath = path.resolve("src/models/sequelize");
    const modelFiles = await readdir(modelPath);
    for (const file of modelFiles) {
      if (file.endsWith(".js")) {
        const filePath = path.join(modelPath, file);
        const fileUrl = pathToFileURL(filePath).href;
        const model = (await import(fileUrl)).default(sequelize, Sequelize.DataTypes);
        models[model.name] = model;
        fastify.log.info(`Loaded model: ${model.name}`);
      }
    }

    Object.values(models).forEach((model) => {
      if (model.associate) {
        model.associate(models);
      }
    });

    await sequelize.sync({ alter: false });
    fastify.log.info("Sequelize models were synchronized successfully.");

    fastify.decorate("models", models);
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
