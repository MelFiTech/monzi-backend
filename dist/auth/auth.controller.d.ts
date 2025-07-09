import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, VerifyOtpDto, ResendOtpDto, RegisterResponseDto, OtpResponseDto, AuthResponseDto, UserProfileDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<RegisterResponseDto>;
    login(loginDto: LoginDto): Promise<AuthResponseDto>;
    verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto>;
    resendOtp(resendOtpDto: ResendOtpDto): Promise<OtpResponseDto>;
    getProfile(req: any): Promise<UserProfileDto>;
}
