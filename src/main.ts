import "./styles.css";

import fragment from "./shaders/point.frag.wgsl?raw";
import vertex from "./shaders/point.vert.wgsl?raw";

import { pointVertices } from "./data";
import { mat4, vec3 } from "gl-matrix";

/**
 * Steps:
 * 1. Setup webgpu and canvas
 * 2. Setup buffers
 * 3. Setup pipeline
 * 4. Draw
 */

// Initial setup

if (!navigator.gpu) {
  throw new Error("WebGPU is not supported");
}

const adapter = await navigator.gpu.requestAdapter({
  powerPreference: "high-performance",
  // powerPreference: 'low-power'
});
if (!adapter) throw new Error("No Adapter Found");
const device = await adapter.requestDevice();

const canvas = document.querySelector("canvas") as HTMLCanvasElement;
const context = canvas.getContext("webgpu") as GPUCanvasContext;
const format = navigator.gpu.getPreferredCanvasFormat();

const devicePixelRatio = window.devicePixelRatio || 1;

canvas.width = canvas.clientWidth * devicePixelRatio;
canvas.height = canvas.clientHeight * devicePixelRatio;

const size = { width: canvas.width, height: canvas.height };
context.configure({
  // json specific format when key and value are the same
  device,
  format,
  // prevent chrome warning
  alphaMode: "opaque",
});

// Point vertex buffer setup
const pointVertexBuffer = device.createBuffer({
  size: pointVertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

device.queue.writeBuffer(pointVertexBuffer, 0, pointVertices);

// Pipeline setup
const pipelineDescriptor: GPURenderPipelineDescriptor = {
  layout: "auto",
  vertex: {
    module: device.createShaderModule({
      code: vertex,
    }),
    entryPoint: "main",
    buffers: [
      {
        arrayStride: 6 * 4,
        attributes: [
          {
            shaderLocation: 0, // [[location(0)]]
            offset: 0,
            format: "float32x3",
          },
          {
            shaderLocation: 1, // [[location(1)]]
            offset: 3 * 4,
            format: "float32x3",
          },
        ],
      },
    ],
  },
  primitive: {
    topology: "point-list",
  },
  fragment: {
    module: device.createShaderModule({
      code: fragment,
    }),
    entryPoint: "main",
    targets: [
      {
        format,
      },
    ],
  },
};

const pipeline = device.createRenderPipeline(pipelineDescriptor);

// Modelview matrix buffer setup

const viewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const modelViewProjectionMatrix = mat4.create();

const aspect = Math.abs(canvas.width / canvas.height);
mat4.perspective(projectionMatrix, Math.PI * 0.5, aspect, 0.1, 1000.0);

const uniformBuffer = device.createBuffer({
  size: 16 * 4, // 4x4 matrix
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const uniformBindGroup = device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
});

const getTransformationMatrix = () => {
  mat4.identity(viewMatrix);

  const now = Date.now() / 2000;

  mat4.rotate(viewMatrix, viewMatrix, Math.PI / 2, vec3.fromValues(1, 0, 0));
  mat4.rotate(viewMatrix, viewMatrix, now, vec3.fromValues(0, 0, 1));
  mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(-2, -2, 0));

  mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);

  return modelViewProjectionMatrix;
};

export const draw = () => {
  //@ts-ignore
  device.queue.writeBuffer(uniformBuffer, 0, getTransformationMatrix());

  const commandEncoder = device.createCommandEncoder();
  const view = context.getCurrentTexture().createView();
  const renderPassDescriptor: GPURenderPassDescriptor = {
    colorAttachments: [
      {
        view,
        clearValue: { r: 0, g: 0, b: 0, a: 1.0 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  };

  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, uniformBindGroup);

  passEncoder.setVertexBuffer(0, pointVertexBuffer);
  passEncoder.draw(pointVertices.length / 6, 1, 0, 0);
  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);

  requestAnimationFrame(draw);
};

draw();

window.addEventListener("resize", () => {
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const aspect = Math.abs(canvas.width / canvas.height);
  mat4.perspective(projectionMatrix, Math.PI * 0.5, aspect, 0.1, 1000.0);
});
