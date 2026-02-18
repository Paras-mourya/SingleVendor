import GoogleMapService from '../services/googleMap.service.js';
import catchAsync from '../utils/catchAsync.js';
import ApiResponse from '../utils/apiResponse.js';
import { HTTP_STATUS } from '../constants.js';
import MultiLayerCache from '../utils/multiLayerCache.js';
import AuditLogger from '../utils/audit.js';

class GoogleMapController {
  getSettings = catchAsync(async (req, res) => {
    const settings = await GoogleMapService.getSettings();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, settings));
  });

  getPublicSettings = catchAsync(async (req, res) => {
    const settings = await GoogleMapService.getPublicSettings();
    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, settings));
  });

  updateSettings = catchAsync(async (req, res) => {
    const settings = await GoogleMapService.updateSettings(
      req.body,
      req.user?._id || req.admin?._id,
      req.role === 'admin' ? 'Admin' : 'Employee'
    );

    // Invalidate Cache
    await MultiLayerCache.delByPattern('*google-map-apis*');

    // Audit Log
    AuditLogger.log('UPDATE_GOOGLE_MAP_SETTINGS', 'THIRD_PARTY_CONFIG', {
      updatedBy: req.user?._id || req.admin?._id,
    });

    res.status(HTTP_STATUS.OK).json(new ApiResponse(HTTP_STATUS.OK, settings, 'Map settings updated successfully'));
  });
}

export default new GoogleMapController();
