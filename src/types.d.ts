import { vec3 } from "gl-matrix";

export interface Point {
  position: vec3;
  color: vec3;
}

export interface Line {
  start: vec3;
  end: vec3;
  color: vec3;
}
