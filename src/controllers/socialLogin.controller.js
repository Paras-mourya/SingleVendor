import SocialLoginService from '../services/socialLogin.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import AuditLogger from '../utils/audit.js';

class SocialLoginController {
  getAllProviders = catchAsync(async (req, res) => {
    const providers = await SocialLoginService.getAllProviders();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, providers));
  });

  getPublicProviders = catchAsync(async (req, res) => {
    const providers = await SocialLoginService.getPublicProviders();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, providers));
  });

  updateProvider = catchAsync(async (req, res) => {
    const provider = await SocialLoginService.updateProvider(
      req.params.provider,
      req.body,
      req.user?._id || req.admin?._id,
      req.role === 'admin' ? 'Admin' : 'Employee'
    );

    // Invalidate Cache
    await MultiLayerCache.delByPattern('*social-login*');

    // Audit Log
    AuditLogger.log('UPDATE_SOCIAL_LOGIN_PROVIDER', 'THIRD_PARTY_CONFIG', {
      provider: req.params.provider,
      updatedBy: req.user?._id || req.admin?._id,
    });

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, provider, 'Provider updated successfully'));
  });
}

export default new SocialLoginController();
