import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

@ValidatorConstraint({ name: 'MatchingFields', async: false })
export class NonEmptyFields implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    return (
      Object.keys(args.object).length > 0 &&
      Object.values(args.object).filter((value) => value).length > 0
    );
  }

  defaultMessage(args: ValidationArguments) {
    return ` no data to update`;
  }
}

export function IsNonEmptyFields(validationOptions?: ValidationOptions) {
  return function (constructor: Function) {
    registerDecorator({
      name: 'isNonEmptyFields',
      target: constructor,
      propertyName: undefined!,
      constraints: [],
      options: validationOptions,
      validator: NonEmptyFields,
    });
  };
}
