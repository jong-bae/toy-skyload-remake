// 정점 투영만 원작 방식으로 바꾼 단색(정점 색) 재질
import * as THREE from 'three';
import { CLASSIC_PROJECT_GLSL } from './projection';

export function classicMaterial(): THREE.MeshBasicMaterial {
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${CLASSIC_PROJECT_GLSL}`)
      .replace(
        '#include <project_vertex>',
        'vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);\ngl_Position = classicProject(mvPosition.xyz);',
      );
  };
  return mat;
}
