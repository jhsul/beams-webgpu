import input from "./data/input.txt?raw";
import output from "./data/output.txt?raw";
import { vec3 } from "gl-matrix";
import { Line, Point } from "./types";

const EARTH_RADIUS = 6378; // RADIUS OF EARTH in km

const userPoints: Point[] = [];
const satellitePoints: Point[] = [];
const interfererPoints: Point[] = [];

const lines: Line[] = [];

// Parse object positions from input.txt
for (const line of input.split("\n")) {
  const isUser = line.startsWith("user");
  const isSatellite = line.startsWith("sat");
  const isInterferer = line.startsWith("interferer");

  if (!isUser && !isSatellite && !isInterferer) continue;

  const words = line.split(" ");

  const position = vec3.fromValues(
    parseInt(words[2]) / EARTH_RADIUS,
    parseInt(words[3]) / EARTH_RADIUS,
    parseInt(words[4]) / EARTH_RADIUS
  );

  // Use red by default
  if (isUser) userPoints.push({ position, color: [1, 0, 0] });
  if (isSatellite) satellitePoints.push({ position, color: [0, 1, 1] });
  if (isInterferer) interfererPoints.push({ position, color: [1, 0.5, 0] });
}

// Parse beams from output.txt
for (const line of output.split("\n")) {
  if (!line.startsWith("sat")) continue;
  const words = line.split(" ");

  const satellite = parseInt(words[1]) - 1;
  const user = parseInt(words[5]) - 1;

  userPoints[user].color = [0, 1, 0];

  lines.push({
    start: userPoints[user].position,
    end: satellitePoints[satellite].position,
    color: [1, 1, 1],
  });
}

const points = [...userPoints, ...satellitePoints, ...interfererPoints];

// Export the final point vertex buffer
export const pointVertices = new Float32Array(
  points.map((p) => [...p.position, ...p.color]).flat()
);

export const lineVertices = new Float32Array(
  lines.map((l) => [...l.start, ...l.color, ...l.end, ...l.color]).flat()
);
