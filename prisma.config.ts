import { defineConfig } from "@prisma/config";
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config();

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
