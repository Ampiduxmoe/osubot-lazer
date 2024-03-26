import {IDifficultyAttributes} from './IDifficultyAttributes';

export interface IDifficultyAttributesOsu extends IDifficultyAttributes {
  aim_difficulty: number;
  approach_rate: number;
  flashlight_difficulty: number;
  overall_difficulty: number;
  slider_factor: number;
  speed_difficulty: number;
}
