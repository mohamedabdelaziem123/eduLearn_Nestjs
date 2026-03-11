import { IsMongoId, IsNotEmpty } from 'class-validator';

export class AddToCartDto {
    @IsMongoId({ message: 'Invalid Lesson ID format' })
    @IsNotEmpty()
    lessonId: string;
}

export class RemoveFromCartDto {
    @IsMongoId({ message: 'Invalid Lesson ID format' })
    @IsNotEmpty()
    lessonId: string;
}
