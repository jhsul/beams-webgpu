import "./styles.css";

import { mat4, vec3 } from "gl-matrix";
import Stats from "stats.js";

import basicFragShader from "./shaders/basic.frag.wgsl?raw";
import whiteFragShader from "./shaders/white.frag.wgsl?raw";

import basicVertShader from "./shaders/basic.vert.wgsl?raw";

import { lineVertices, pointVertices } from "./vertices";

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

// Point pipeline setup
const pointPipelineDescriptor: GPURenderPipelineDescriptor = {
  layout: "auto",
  vertex: {
    module: device.createShaderModule({
      code: basicVertShader,
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
      code: basicFragShader,
    }),
    entryPoint: "main",
    targets: [
      {
        format,
      },
    ],
  },
};

const pointPipeline = device.createRenderPipeline(pointPipelineDescriptor);

// Line vertex buffer setup
const lineVertexBuffer = device.createBuffer({
  size: lineVertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});

device.queue.writeBuffer(lineVertexBuffer, 0, lineVertices);

// Line pipeline setup
const linePipelineDescriptor: GPURenderPipelineDescriptor = {
  layout: "auto",
  vertex: {
    module: device.createShaderModule({
      code: basicVertShader,
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
    topology: "line-list",
  },
  fragment: {
    module: device.createShaderModule({
      code: whiteFragShader,
    }),
    entryPoint: "main",
    targets: [
      {
        format,
      },
    ],
  },
};

const linePipeline = device.createRenderPipeline(linePipelineDescriptor);

const pointUniformBuffer = device.createBuffer({
  size: 16 * 4, // 4x4 matrix
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const pointUniformBindGroup = device.createBindGroup({
  layout: pointPipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: pointUniformBuffer } }],
});

const lineUniformBuffer = device.createBuffer({
  size: 16 * 4, // 4x4 matrix
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

const lineUniformBindGroup = device.createBindGroup({
  layout: linePipeline.getBindGroupLayout(0),
  entries: [{ binding: 0, resource: { buffer: lineUniformBuffer } }],
});

// Camera matrix setup
const viewMatrix = mat4.create();
const projectionMatrix = mat4.create();
const modelViewProjectionMatrix = mat4.create();

const resetProjectionMatrix = () => {
  const aspect = Math.abs(canvas.width / canvas.height);
  mat4.perspective(projectionMatrix, Math.PI * 0.5, aspect, 0.1, 1000.0);
};

resetProjectionMatrix();

const getTransformationMatrix = () => {
  mat4.identity(viewMatrix);

  const now = Date.now() / 2000;
  mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -2));

  mat4.rotateX(viewMatrix, viewMatrix, Math.PI / 2);
  mat4.rotateZ(viewMatrix, viewMatrix, now);

  mat4.multiply(modelViewProjectionMatrix, projectionMatrix, viewMatrix);

  return modelViewProjectionMatrix;
};

const stats = new Stats();
stats.showPanel(0);
document.body.appendChild(stats.dom);

export const draw = () => {
  stats.begin();
  //@ts-ignore
  device.queue.writeBuffer(pointUniformBuffer, 0, getTransformationMatrix());
  //@ts-ignore
  device.queue.writeBuffer(lineUniformBuffer, 0, getTransformationMatrix());

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

  passEncoder.setPipeline(linePipeline);
  passEncoder.setBindGroup(0, lineUniformBindGroup);
  passEncoder.setVertexBuffer(0, lineVertexBuffer);
  passEncoder.draw(lineVertices.length / 6, 1, 0, 0);

  passEncoder.setPipeline(pointPipeline);
  passEncoder.setBindGroup(0, pointUniformBindGroup);
  passEncoder.setVertexBuffer(0, pointVertexBuffer);
  passEncoder.draw(pointVertices.length / 6, 1, 0, 0);

  passEncoder.end();

  device.queue.submit([commandEncoder.finish()]);

  stats.end();

  requestAnimationFrame(draw);
};

draw();

window.addEventListener("resize", () => {
  resetProjectionMatrix();
});
