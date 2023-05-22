import Joi from "joi";

// This is the interface for the example
export interface IExample {
  name: string;
  age: number;
}

// Simple validator
export const exampleJoi = Joi.object({
  name: Joi.string().required(),
  age: Joi.number().required(),
});

// Typeguard
export function isExample(obj: any): obj is IExample {
  return exampleJoi.validate(obj).error === undefined;
}
