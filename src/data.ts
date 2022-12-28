import input from "./data/input.txt?raw";
import output from "../data/output.txt?raw";

const SCALE = 6378; // RADIUS OF EARTH in km

const parseData = () => {
  const points: number[] = [];

  for (const line of input.split("\n")) {
    const isUser = line.startsWith("user");
    const isSatellite = line.startsWith("sat");
    const isInterferer = line.startsWith("interferer");

    if (!isUser && !isSatellite && !isInterferer) continue;

    const words = line.split(" ");
    points.push(
      parseInt(words[2]) / SCALE,
      parseInt(words[3]) / SCALE,
      parseInt(words[4]) / SCALE
    );

    if (isUser) points.push(0, 0, 1);
    if (isSatellite) points.push(1, 0, 0);
    if (isInterferer) points.push(0, 1, 0);
  }

  const pointVertices = new Float32Array(points);

  return { pointVertices };
};

export const { pointVertices } = parseData();
