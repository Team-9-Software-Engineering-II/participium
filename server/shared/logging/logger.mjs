import winston from "winston";
import "winston-daily-rotate-file";
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// Format for production
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Format for development
const devFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} [${info.service || "APP"}] ${info.level}: ${
        info.message
      }`
  )
);

const { combine, timestamp, json, printf, colorize } = winston.format;

const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: "logs/application-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "14d",
  level: "info",
});

const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxSize: "20m",
  maxFiles: "30d",
  level: "error",
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: combine(timestamp(), json()),
  defaultMeta: { service: "backend-api" },
  transports: [errorRotateTransport, combinedRotateTransport],
});
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: combine(colorize(), winston.format.simple()),
    })
  );
}

export default logger;
