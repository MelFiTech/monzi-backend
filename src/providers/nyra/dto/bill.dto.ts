import { IsString, IsNumber, IsEnum, IsOptional, Min, MaxLength, IsNumberString } from 'class-validator';

export enum NetworkProvider {
  MTN = 'MTN',
  AIRTEL = 'AIRTEL',
  GLO = 'GLO',
  NINE_MOBILE = '9MOBILE',
}

export class GetDataPlansDto {
  @IsEnum(NetworkProvider)
  network: NetworkProvider;
}

export class PurchaseDataDto {
  @IsString()
  @MaxLength(15)
  phoneNumber: string;

  @IsString()
  bundleId: string;

  @IsNumber()
  @Min(100)
  amount: number;
}

export class PurchaseAirtimeDto {
  @IsString()
  @MaxLength(15)
  phoneNumber: string;

  @IsNumber()
  @Min(50)
  amount: number;
}

export class BillHistoryDto {
  @IsOptional()
  @IsNumberString()
  limit?: string = '20';

  @IsOptional()
  @IsNumberString()
  offset?: string = '0';
}

export class BillServiceResponse {
  id: string;
  service: string;
}

export class DataPlanResponse {
  bundle_id: string;
  data_bundle: string;
  amount: string;
  validity: string;
}

export class BillPurchaseResponse {
  success: boolean;
  reference: string;
  amount: number;
  status: string;
  message: string;
}

export class BillHistoryResponse {
  id: string;
  reference: string;
  amount: number;
  type: string;
  phoneNumber: string;
  status: string;
  createdAt: Date;
  description: string;
}
