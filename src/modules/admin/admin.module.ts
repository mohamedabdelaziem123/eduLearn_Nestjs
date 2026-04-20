import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { userModel, UserRepository } from 'src/DB';
import { OrderModel } from 'src/DB/model/order.model';
import { OrderRepository } from 'src/DB/repository/order.repository';
import { CourseModel } from 'src/DB/model/course.model';
import { CourseRepository } from 'src/DB/repository/course.repository';
import { CdnService } from 'src/common';


@Module({
  imports: [userModel, OrderModel, CourseModel],
  controllers: [AdminController],
  providers: [
    AdminService,
    UserRepository,
    OrderRepository,
    CourseRepository,
    CdnService,
  ],
})
export class AdminModule { }
