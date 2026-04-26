use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::JsValue;

const FIT_KERNEL_WASM_XPBD_ABI_VERSION: &str = "fit-kernel-wasm-xpbd.v1";
const FIT_KERNEL_XPBD_PREVIEW_SOLVE_SCHEMA_VERSION: &str = "xpbd-preview-solve.v1";
const FIT_KERNEL_XPBD_DEFORMATION_BUFFER_SCHEMA_VERSION: &str =
    "preview-fit-mesh-deformation-buffer.v1";
const MINIMUM_DELTA_SECONDS: f32 = 1.0 / 240.0;
const MAXIMUM_DELTA_SECONDS: f32 = 1.0 / 24.0;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FitKernelXpbdSolveInput {
    schema_version: String,
    session_id: String,
    garment_id: String,
    sequence: u32,
    positions: Vec<f32>,
    previous_positions: Option<Vec<f32>>,
    inverse_masses: Vec<f32>,
    constraints: Vec<FitKernelXpbdConstraint>,
    iterations: u32,
    delta_seconds: f32,
    gravity: Option<[f32; 3]>,
    damping: Option<f32>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FitKernelXpbdConstraint {
    kind: String,
    particle_a: Option<usize>,
    particle_b: Option<usize>,
    rest_length_meters: Option<f32>,
    particle: Option<usize>,
    target: Option<[f32; 3]>,
    compliance: Option<f32>,
    center: Option<[f32; 3]>,
    radius_meters: Option<f32>,
    margin_meters: Option<f32>,
    friction: Option<f32>,
}

#[derive(Serialize, Deserialize, Debug, PartialEq)]
#[serde(rename_all = "camelCase")]
struct FitKernelXpbdDeformationBuffer {
    schema_version: String,
    garment_id: String,
    session_id: String,
    sequence: u32,
    solver_kind: String,
    transfer_mode: String,
    vertex_count: usize,
    positions: Vec<f32>,
    displacements: Vec<f32>,
    max_displacement_mm: f32,
    residual_error: f32,
    has_na_n: bool,
    iterations: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FitKernelWasmXpbdMetadata {
    abi_version: &'static str,
    solve_schema_version: &'static str,
    deformation_schema_version: &'static str,
    engine_kind: &'static str,
    execution_mode: &'static str,
}

impl Default for FitKernelWasmXpbdMetadata {
    fn default() -> Self {
        Self {
            abi_version: FIT_KERNEL_WASM_XPBD_ABI_VERSION,
            solve_schema_version: FIT_KERNEL_XPBD_PREVIEW_SOLVE_SCHEMA_VERSION,
            deformation_schema_version: FIT_KERNEL_XPBD_DEFORMATION_BUFFER_SCHEMA_VERSION,
            engine_kind: "wasm-preview",
            execution_mode: "wasm-preview",
        }
    }
}

fn clamp_number(value: f32, min: f32, max: f32) -> f32 {
    value.max(min).min(max)
}

fn is_finite_number(value: f32) -> bool {
    value.is_finite()
}

fn assert_all_finite(values: &[f32], label: &str) -> Result<(), String> {
    if values.iter().all(|value| is_finite_number(*value)) {
        Ok(())
    } else {
        Err(format!("{label} contains a non-finite value."))
    }
}

fn assert_particle_index(particle: usize, vertex_count: usize, label: &str) -> Result<(), String> {
    if particle < vertex_count {
        Ok(())
    } else {
        Err(format!(
            "{label} references invalid particle index {particle}."
        ))
    }
}

fn read_vector(positions: &[f32], particle: usize) -> [f32; 3] {
    let offset = particle * 3;
    [
        *positions.get(offset).unwrap_or(&0.0),
        *positions.get(offset + 1).unwrap_or(&0.0),
        *positions.get(offset + 2).unwrap_or(&0.0),
    ]
}

fn write_vector(positions: &mut [f32], particle: usize, vector: [f32; 3]) {
    let offset = particle * 3;
    positions[offset] = vector[0];
    positions[offset + 1] = vector[1];
    positions[offset + 2] = vector[2];
}

fn vector_length(x: f32, y: f32, z: f32) -> f32 {
    (x * x + y * y + z * z).sqrt()
}

fn compliance_alpha(compliance: Option<f32>, delta_seconds: f32) -> f32 {
    compliance.unwrap_or(0.0).max(0.0) / (delta_seconds * delta_seconds).max(1.0e-8)
}

fn round_to(value: f32, decimals: i32) -> f32 {
    let scale = 10_f32.powi(decimals);
    (value * scale).round() / scale
}

fn apply_distance_constraint(
    positions: &mut [f32],
    inverse_masses: &[f32],
    vertex_count: usize,
    constraint: &FitKernelXpbdConstraint,
    delta_seconds: f32,
) -> Result<f32, String> {
    let particle_a = constraint
        .particle_a
        .ok_or_else(|| format!("{} constraint requires particleA.", constraint.kind))?;
    let particle_b = constraint
        .particle_b
        .ok_or_else(|| format!("{} constraint requires particleB.", constraint.kind))?;
    let rest_length = constraint.rest_length_meters.ok_or_else(|| {
        format!(
            "{} constraint requires restLengthMeters.",
            constraint.kind
        )
    })?;
    assert_particle_index(particle_a, vertex_count, &constraint.kind)?;
    assert_particle_index(particle_b, vertex_count, &constraint.kind)?;
    if !is_finite_number(rest_length) || rest_length < 0.0 {
        return Err(format!(
            "{} constraint has an invalid rest length.",
            constraint.kind
        ));
    }

    let a = read_vector(positions, particle_a);
    let b = read_vector(positions, particle_b);
    let dx = a[0] - b[0];
    let dy = a[1] - b[1];
    let dz = a[2] - b[2];
    let length = vector_length(dx, dy, dz);
    if length <= 1.0e-8 {
        return Ok(0.0);
    }

    let weight_a = *inverse_masses.get(particle_a).unwrap_or(&0.0);
    let weight_b = *inverse_masses.get(particle_b).unwrap_or(&0.0);
    let weight_sum = weight_a + weight_b;
    if weight_sum <= 0.0 {
        return Ok(0.0);
    }

    let residual = length - rest_length;
    let lambda = -residual / (weight_sum + compliance_alpha(constraint.compliance, delta_seconds));
    let nx = dx / length;
    let ny = dy / length;
    let nz = dz / length;

    write_vector(
        positions,
        particle_a,
        [
            a[0] + weight_a * lambda * nx,
            a[1] + weight_a * lambda * ny,
            a[2] + weight_a * lambda * nz,
        ],
    );
    write_vector(
        positions,
        particle_b,
        [
            b[0] - weight_b * lambda * nx,
            b[1] - weight_b * lambda * ny,
            b[2] - weight_b * lambda * nz,
        ],
    );

    Ok(residual.abs())
}

fn apply_pin_constraint(
    positions: &mut [f32],
    inverse_masses: &[f32],
    vertex_count: usize,
    constraint: &FitKernelXpbdConstraint,
    delta_seconds: f32,
) -> Result<f32, String> {
    let particle = constraint
        .particle
        .ok_or_else(|| "pin constraint requires particle.".to_string())?;
    let target = constraint
        .target
        .ok_or_else(|| "pin constraint requires target.".to_string())?;
    assert_particle_index(particle, vertex_count, "pin")?;

    let weight = *inverse_masses.get(particle).unwrap_or(&0.0);
    if weight <= 0.0 {
        return Ok(0.0);
    }

    let position = read_vector(positions, particle);
    let residual_x = target[0] - position[0];
    let residual_y = target[1] - position[1];
    let residual_z = target[2] - position[2];
    let alpha = compliance_alpha(constraint.compliance, delta_seconds);
    let correction_scale = weight / (weight + alpha);
    write_vector(
        positions,
        particle,
        [
            position[0] + residual_x * correction_scale,
            position[1] + residual_y * correction_scale,
            position[2] + residual_z * correction_scale,
        ],
    );

    Ok(vector_length(residual_x, residual_y, residual_z))
}

fn apply_sphere_collision_constraint(
    positions: &mut [f32],
    inverse_masses: &[f32],
    vertex_count: usize,
    constraint: &FitKernelXpbdConstraint,
) -> Result<f32, String> {
    let particle = constraint
        .particle
        .ok_or_else(|| "sphere-collision constraint requires particle.".to_string())?;
    let center = constraint
        .center
        .ok_or_else(|| "sphere-collision constraint requires center.".to_string())?;
    let radius = constraint
        .radius_meters
        .ok_or_else(|| "sphere-collision constraint requires radiusMeters.".to_string())?;
    assert_particle_index(particle, vertex_count, "sphere-collision")?;
    if !is_finite_number(radius) || radius <= 0.0 {
        return Err("sphere-collision constraint has an invalid radius.".to_string());
    }

    let weight = *inverse_masses.get(particle).unwrap_or(&0.0);
    if weight <= 0.0 {
        return Ok(0.0);
    }

    let position = read_vector(positions, particle);
    let dx = position[0] - center[0];
    let dy = position[1] - center[1];
    let dz = position[2] - center[2];
    let distance = vector_length(dx, dy, dz);
    let target_radius = radius + constraint.margin_meters.unwrap_or(0.0);
    if distance >= target_radius {
        return Ok(0.0);
    }

    let (nx, ny, nz) = if distance > 1.0e-8 {
        (dx / distance, dy / distance, dz / distance)
    } else {
        (0.0, 1.0, 0.0)
    };
    let friction_scale = clamp_number(1.0 - constraint.friction.unwrap_or(0.0), 0.05, 1.0);
    write_vector(
        positions,
        particle,
        [
            center[0] + nx * target_radius,
            center[1] + ny * target_radius * friction_scale + position[1] * (1.0 - friction_scale),
            center[2] + nz * target_radius,
        ],
    );

    Ok(target_radius - distance)
}

fn assert_xpbd_solve_input(input: &FitKernelXpbdSolveInput) -> Result<(), String> {
    if input.schema_version != FIT_KERNEL_XPBD_PREVIEW_SOLVE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported XPBD solve schema version: {}",
            input.schema_version
        ));
    }
    if input.session_id.trim().is_empty() || input.garment_id.trim().is_empty() {
        return Err("XPBD solve input requires sessionId and garmentId.".to_string());
    }
    if input.iterations == 0 || input.iterations > 128 {
        return Err("XPBD solve input iterations must be between 1 and 128.".to_string());
    }
    if !is_finite_number(input.delta_seconds) || input.delta_seconds <= 0.0 {
        return Err("XPBD solve input requires a positive deltaSeconds.".to_string());
    }
    Ok(())
}

fn solve_xpbd_preview_internal(
    input: FitKernelXpbdSolveInput,
) -> Result<FitKernelXpbdDeformationBuffer, String> {
    assert_xpbd_solve_input(&input)?;
    if input.positions.is_empty() || input.positions.len() % 3 != 0 {
        return Err("positions length must be a non-empty multiple of 3.".to_string());
    }
    assert_all_finite(&input.positions, "positions")?;
    assert_all_finite(&input.inverse_masses, "inverseMasses")?;
    if let Some(previous_positions) = input.previous_positions.as_ref() {
        assert_all_finite(previous_positions, "previousPositions")?;
    }

    let vertex_count = input.positions.len() / 3;
    let previous_positions = input
        .previous_positions
        .clone()
        .unwrap_or_else(|| input.positions.clone());
    if previous_positions.len() != input.positions.len() {
        return Err("previousPositions length must match positions length.".to_string());
    }
    if input.inverse_masses.len() != vertex_count {
        return Err("inverseMasses length must match vertex count.".to_string());
    }

    let mut positions = input.positions.clone();
    let delta_seconds = clamp_number(
        input.delta_seconds,
        MINIMUM_DELTA_SECONDS,
        MAXIMUM_DELTA_SECONDS,
    );
    let gravity = input.gravity.unwrap_or([0.0, -9.81, 0.0]);
    let damping = clamp_number(input.damping.unwrap_or(0.985), 0.0, 1.0);

    for particle in 0..vertex_count {
        let inverse_mass = *input.inverse_masses.get(particle).unwrap_or(&0.0);
        if inverse_mass <= 0.0 {
            continue;
        }

        let offset = particle * 3;
        positions[offset] = positions[offset]
            + (positions[offset] - previous_positions[offset]) * damping
            + gravity[0] * delta_seconds * delta_seconds;
        positions[offset + 1] = positions[offset + 1]
            + (positions[offset + 1] - previous_positions[offset + 1]) * damping
            + gravity[1] * delta_seconds * delta_seconds;
        positions[offset + 2] = positions[offset + 2]
            + (positions[offset + 2] - previous_positions[offset + 2]) * damping
            + gravity[2] * delta_seconds * delta_seconds;
    }

    let mut accumulated_residual = 0.0_f32;
    for _ in 0..input.iterations {
        for constraint in &input.constraints {
            let residual = match constraint.kind.as_str() {
                "pin" => apply_pin_constraint(
                    &mut positions,
                    &input.inverse_masses,
                    vertex_count,
                    constraint,
                    delta_seconds,
                )?,
                "sphere-collision" => apply_sphere_collision_constraint(
                    &mut positions,
                    &input.inverse_masses,
                    vertex_count,
                    constraint,
                )?,
                "stretch" | "shear" | "bend" | "waistband" | "strap" | "hem" => {
                    apply_distance_constraint(
                        &mut positions,
                        &input.inverse_masses,
                        vertex_count,
                        constraint,
                        delta_seconds,
                    )?
                }
                other => {
                    return Err(format!("Unsupported XPBD constraint kind: {other}"));
                }
            };
            accumulated_residual += residual;
        }
    }

    let mut displacements = vec![0.0_f32; input.positions.len()];
    let mut max_displacement_meters = 0.0_f32;
    let mut has_na_n = false;
    for index in (0..positions.len()).step_by(3) {
        let dx = positions[index] - input.positions[index];
        let dy = positions[index + 1] - input.positions[index + 1];
        let dz = positions[index + 2] - input.positions[index + 2];
        displacements[index] = dx;
        displacements[index + 1] = dy;
        displacements[index + 2] = dz;
        has_na_n = has_na_n
            || !is_finite_number(positions[index])
            || !is_finite_number(positions[index + 1])
            || !is_finite_number(positions[index + 2]);
        max_displacement_meters =
            max_displacement_meters.max(vector_length(dx, dy, dz));
    }

    Ok(FitKernelXpbdDeformationBuffer {
        schema_version: FIT_KERNEL_XPBD_DEFORMATION_BUFFER_SCHEMA_VERSION.to_string(),
        garment_id: input.garment_id,
        session_id: input.session_id,
        sequence: input.sequence,
        solver_kind: "xpbd-cloth-preview".to_string(),
        transfer_mode: "fit-mesh-deformation-buffer".to_string(),
        vertex_count,
        positions,
        displacements,
        max_displacement_mm: round_to(max_displacement_meters * 1000.0, 4),
        residual_error: round_to(
            accumulated_residual
                / ((input.iterations as f32) * (input.constraints.len().max(1) as f32)).max(1.0),
            8,
        ),
        has_na_n,
        iterations: input.iterations,
    })
}

fn solve_xpbd_preview_json(input_json: &str) -> Result<String, String> {
    let input = serde_json::from_str::<FitKernelXpbdSolveInput>(input_json)
        .map_err(|error| format!("Failed to parse XPBD solve input: {error}"))?;
    let result = solve_xpbd_preview_internal(input)?;
    serde_json::to_string(&result)
        .map_err(|error| format!("Failed to serialize XPBD deformation buffer: {error}"))
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen)]
pub fn solve_xpbd_preview(input_json: &str) -> Result<String, JsValue> {
    solve_xpbd_preview_json(input_json).map_err(|error| JsValue::from_str(&error))
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen::prelude::wasm_bindgen)]
pub fn xpbd_solver_metadata_json() -> String {
    serde_json::to_string(&FitKernelWasmXpbdMetadata::default())
        .expect("fit-kernel wasm metadata should serialize")
}

#[cfg(test)]
mod tests {
    use super::{
        solve_xpbd_preview_json, xpbd_solver_metadata_json, FitKernelXpbdDeformationBuffer,
        FIT_KERNEL_WASM_XPBD_ABI_VERSION,
    };

    #[test]
    fn solves_a_deterministic_two_particle_preview_step() {
        let result = solve_xpbd_preview_json(
            r#"{
              "schemaVersion": "xpbd-preview-solve.v1",
              "sessionId": "session-a",
              "garmentId": "garment-a",
              "sequence": 3,
              "positions": [0,0,0, 0.15,1,0],
              "previousPositions": [0,0,0, 0.2,1.05,0],
              "inverseMasses": [0,1],
              "constraints": [
                { "kind": "pin", "particle": 0, "target": [0,0,0] },
                {
                  "kind": "stretch",
                  "particleA": 0,
                  "particleB": 1,
                  "restLengthMeters": 1.0
                }
              ],
              "iterations": 4,
              "deltaSeconds": 0.0166666667,
              "gravity": [0,-9.81,0],
              "damping": 0.98
            }"#,
        )
        .expect("solver should succeed");

        let parsed: FitKernelXpbdDeformationBuffer =
            serde_json::from_str(&result).expect("result should parse");

        assert_eq!(parsed.schema_version, "preview-fit-mesh-deformation-buffer.v1");
        assert_eq!(parsed.vertex_count, 2);
        assert_eq!(parsed.iterations, 4);
        assert_eq!(parsed.transfer_mode, "fit-mesh-deformation-buffer");
        assert_eq!(parsed.solver_kind, "xpbd-cloth-preview");
        assert_eq!(parsed.has_na_n, false);
        assert!(parsed.max_displacement_mm > 0.0);
        assert!(parsed.residual_error >= 0.0);
        assert_eq!(parsed.positions.len(), 6);
        assert_eq!(parsed.displacements.len(), 6);
    }

    #[test]
    fn rejects_invalid_particle_references() {
        let error = solve_xpbd_preview_json(
            r#"{
              "schemaVersion": "xpbd-preview-solve.v1",
              "sessionId": "session-a",
              "garmentId": "garment-a",
              "sequence": 1,
              "positions": [0,0,0],
              "inverseMasses": [1],
              "constraints": [
                {
                  "kind": "stretch",
                  "particleA": 0,
                  "particleB": 2,
                  "restLengthMeters": 1.0
                }
              ],
              "iterations": 2,
              "deltaSeconds": 0.0166666667
            }"#,
        )
        .expect_err("solver should reject out-of-range particles");

        assert!(error.contains("invalid particle index 2"));
    }

    #[test]
    fn exposes_metadata_for_the_js_loader_contract() {
        let metadata = xpbd_solver_metadata_json();
        assert!(metadata.contains(FIT_KERNEL_WASM_XPBD_ABI_VERSION));
        assert!(metadata.contains("\"engineKind\":\"wasm-preview\""));
        assert!(metadata.contains("\"executionMode\":\"wasm-preview\""));
    }
}
