import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

@ValidatorConstraint({ name: 'MatchingFields', async: false })
export class MatchingFields implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    const relatedValue = (args.object as any)[args.constraints[0]];

    return value === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.constraints[0]} : ${(args.object as any)[args.constraints[0]]} does not match the ${args.property} : $value`;
  }
}

export function IsMatching(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isMatching',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: MatchingFields,
    });
  };
}
