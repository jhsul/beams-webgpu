struct Uniforms {
    modelViewProjectionMatrix : mat4x4<f32>
};
@group(0) @binding(0) var<uniform> uniforms : Uniforms;

struct PointInput {
    @location(0) position : vec3<f32>,
    @location(1) color: vec3<f32>,
};

struct PointOutput {
    @location(0) color : vec4<f32>,
    @builtin(position) position : vec4<f32>,
};

@vertex
fn main(input: PointInput) -> PointOutput {
    
    var output: PointOutput;

    output.color = vec4<f32>(input.color, 1.0);
    output.position = uniforms.modelViewProjectionMatrix * vec4<f32>(input.position, 1.0);

    return output;
}