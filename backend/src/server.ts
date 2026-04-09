import { app } from "./app";
import { env } from "./config/env";
import { checkDBConnection } from "./db/pool";

const startServer = async () => {
  try {
    await checkDBConnection();
    console.log("Neon database connection successful");

    app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to connect to Neon database", error);
    process.exit(1);
  }
};

void startServer();