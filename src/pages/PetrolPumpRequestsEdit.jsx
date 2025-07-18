import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  InputAdornment,
  Divider,
  MenuItem,
  Popover,
  FormControl,
  InputLabel,
  Select,
  Card,
  CardContent,
  Menu,
  ListItemIcon,
  ListItemText,
  Autocomplete
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  MyLocation as MyLocationIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Info as InfoIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { useNavigate } from 'react-router-dom';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 500,
  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
  padding: theme.spacing(1.5, 2),
  '&.MuiTableCell-head': {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    color: theme.palette.text.primary,
    fontWeight: 600,
    whiteSpace: 'nowrap'
  }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  '&:nth-of-type(odd)': {
    backgroundColor: alpha(theme.palette.background.default, 0.5),
  },
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  },
  '&:last-child td, &:last-child th': {
    border: 0,
  },
  transition: 'background-color 0.2s ease',
}));

const SearchField = styled(TextField)(({ theme }) => ({
  width: '100%',
  maxWidth: 400,
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius * 2,
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    '&.Mui-focused': {
      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`
    }
  }
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  backgroundColor: 
    status === 'pending' ? theme.palette.warning.main :
    status === 'approved' ? theme.palette.success.main :
    theme.palette.error.main,
  color: 'white',
  fontWeight: 600
}));

const PetrolPumpRequestsEdit = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedRequest, setEditedRequest] = useState(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [tabValue, setTabValue] = useState(0); // 0: Pending, 1: Approved, 2: Rejected
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    company: 'all',
    district: 'all',
    dateRange: 'all'
  });
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [districts, setDistricts] = useState([]);
  const [fetchingDistricts, setFetchingDistricts] = useState(true);
  const navigate = useNavigate();

  // Zone options
  const zoneOptions = ['North', 'South', 'East', 'West', 'North East', 'Central', 'South East'];

  // CO/CL/DO options
  const coClDoOptions = ['CO', 'CL', 'DO'];

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [tabValue, requests, searchQuery, filterOptions, startDateFilter, endDateFilter]);

  // Fetch districts from database
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        setFetchingDistricts(true);
        const pumpsRef = collection(db, 'petrolPumps');
        const q = query(pumpsRef);
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const districtsData = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const district = data.district || data.District || '';
            return district.trim().toUpperCase();
          }).filter(district => district !== '');

          // Remove duplicates and sort
          const uniqueDistricts = [...new Set(districtsData)].sort();
          setDistricts(uniqueDistricts);
        }
      } catch (err) {
        console.error('Error fetching districts:', err);
      } finally {
        setFetchingDistricts(false);
      }
    };

    fetchDistricts();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const requestsRef = collection(db, 'petrol_pump_requests');
      const q = query(requestsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching requests:', error);
      showSnackbar(`Error fetching requests: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = [...requests];

    // Filter by search query
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(request =>
        request.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.dealerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        request.sapCode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by tab
    if (tabValue === 0) {
      filtered = filtered.filter(request => request.status === 'pending');
    } else if (tabValue === 1) {
      filtered = filtered.filter(request => request.status === 'approved');
    } else if (tabValue === 2) {
      filtered = filtered.filter(request => request.status === 'rejected');
    }

    // Filter by company
    if (filterOptions.company !== 'all') {
      filtered = filtered.filter(request => request.company === filterOptions.company);
    }

    // Filter by district
    if (filterOptions.district !== 'all') {
      filtered = filtered.filter(request => request.district === filterOptions.district);
    }

    // Filter by date range
    if (filterOptions.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      if (filterOptions.dateRange === 'today') {
        filterDate.setDate(now.getDate() - 1);
      } else if (filterOptions.dateRange === 'week') {
        filterDate.setDate(now.getDate() - 7);
      } else if (filterOptions.dateRange === 'month') {
        filterDate.setMonth(now.getMonth() - 1);
      }
      
      filtered = filtered.filter(request => {
        const requestDate = request.createdAt?.toDate ? request.createdAt.toDate() : new Date(request.createdAt);
        return requestDate >= filterDate;
      });
    }

    // Filter by custom date range
    if (startDateFilter && endDateFilter) {
      const startDate = new Date(startDateFilter);
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      
      filtered = filtered.filter(request => {
        const requestDate = request.createdAt?.toDate ? request.createdAt.toDate() : new Date(request.createdAt);
        return requestDate >= startDate && requestDate <= endDate;
      });
    } else if (startDateFilter) {
      const startDate = new Date(startDateFilter);
      filtered = filtered.filter(request => {
        const requestDate = request.createdAt?.toDate ? request.createdAt.toDate() : new Date(request.createdAt);
        return requestDate >= startDate;
      });
    } else if (endDateFilter) {
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      filtered = filtered.filter(request => {
        const requestDate = request.createdAt?.toDate ? request.createdAt.toDate() : new Date(request.createdAt);
        return requestDate <= endDate;
      });
    }

    setFilteredRequests(filtered);
  };

  const handleEditRequest = (request) => {
    setEditedRequest({...request});
    setEditDialogOpen(true);
  };

  const handleViewReason = (request) => {
    setSelectedRequest(request);
    setReasonDialogOpen(true);
  };

  const handleViewApprovalDetails = (request) => {
    setSelectedRequest(request);
    setReasonDialogOpen(true);
  };

  const handleSaveEditedRequest = async () => {
    try {
      if (!editedRequest) return;
      
      const requestRef = doc(db, 'petrol_pump_requests', editedRequest.id);
      await updateDoc(requestRef, {
        customerName: editedRequest.customerName,
        location: editedRequest.location,
        zone: editedRequest.zone,
        salesArea: editedRequest.salesArea,
        coClDo: editedRequest.coClDo,
        district: editedRequest.district,
        sapCode: editedRequest.sapCode,
        addressLine1: editedRequest.addressLine1,
        addressLine2: editedRequest.addressLine2,
        pincode: editedRequest.pincode,
        dealerName: editedRequest.dealerName,
        contactDetails: editedRequest.contactDetails,
        latitude: Number(editedRequest.latitude),
        longitude: Number(editedRequest.longitude),
        company: editedRequest.company,
        regionalOffice: editedRequest.regionalOffice,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.uid || 'unknown'
      });

      showSnackbar('Request updated successfully', 'success');
      fetchRequests();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating request:', error);
      showSnackbar(`Error updating request: ${error.message}`, 'error');
    }
  };

  const handleEditChange = (field, value) => {
    setEditedRequest(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterChange = (field, value) => {
    setFilterOptions(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilterOptions({
      company: 'all',
      district: 'all',
      dateRange: 'all'
    });
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    
    // If it's a Firestore timestamp
    if (date && date.toDate && typeof date.toDate === 'function') {
      return date.toDate().toLocaleString();
    }
    
    // If it's a date string
    if (typeof date === 'string') {
      return new Date(date).toLocaleString();
    }
    
    // If it's already a Date
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    
    return 'Invalid date';
  };

  const getStatusCount = (status) => {
    return requests.filter(request => request.status === status).length;
  };

  const getUniqueCompanies = () => {
    return [...new Set(requests.map(request => request.company).filter(Boolean))];
  };

  const getUniqueDistricts = () => {
    return [...new Set(requests.map(request => request.district).filter(Boolean))];
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate('/petrol-pump-requests')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            Edit Petrol Pump Requests
          </Typography>
        </Box>
      </Box>
      
      <Card sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <SearchField
              placeholder="Search by customer name, district, company, dealer name, or SAP code..."
              variant="outlined"
              value={searchQuery}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              sx={{ '.MuiTab-root': { fontWeight: 500, minWidth: 100 } }}
            >
              <Tab label={`Pending (${getStatusCount('pending')})`} />
              <Tab label={`Approved (${getStatusCount('approved')})`} />
              <Tab label={`Rejected (${getStatusCount('rejected')})`} />
            </Tabs>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={handleFilterClick}
                sx={{ 
                  borderRadius: 2,
                  px: 2,
                  py: 0.75
                }}
              >
                Filter
              </Button>
              {(filterOptions.company !== 'all' || filterOptions.district !== 'all' || filterOptions.dateRange !== 'all') && (
                <Button
                  variant="text"
                  onClick={clearFilters}
                  size="small"
                  sx={{ color: 'text.secondary' }}
                >
                  Clear Filters
                </Button>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Filter Popover */}
      <Popover
        open={Boolean(filterAnchorEl)}
        anchorEl={filterAnchorEl}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { p: 2, minWidth: 300 }
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>Filter Options</Typography>
        
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Company</InputLabel>
          <Select
            value={filterOptions.company}
            label="Company"
            onChange={(e) => handleFilterChange('company', e.target.value)}
          >
            <MenuItem value="all">All Companies</MenuItem>
            {getUniqueCompanies().map(company => (
              <MenuItem key={company} value={company}>{company}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>District</InputLabel>
          <Select
            value={filterOptions.district}
            label="District"
            onChange={(e) => handleFilterChange('district', e.target.value)}
          >
            <MenuItem value="all">All Districts</MenuItem>
            {getUniqueDistricts().map(district => (
              <MenuItem key={district} value={district}>{district}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Date Range</InputLabel>
          <Select
            value={filterOptions.dateRange}
            label="Date Range"
            onChange={(e) => handleFilterChange('dateRange', e.target.value)}
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="today">Today</MenuItem>
            <MenuItem value="week">Last 7 Days</MenuItem>
            <MenuItem value="month">Last 30 Days</MenuItem>
          </Select>
        </FormControl>

        <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Created Date Range</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            onClick={handleFilterClose}
            fullWidth
          >
            Apply Filters
          </Button>
        </Box>
      </Popover>

      <Card sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="requests table">
            <TableHead>
              <TableRow>
                <StyledTableCell>Customer Name</StyledTableCell>
                <StyledTableCell>Company</StyledTableCell>
                <StyledTableCell>District</StyledTableCell>
                <StyledTableCell>Requested On</StyledTableCell>
                <StyledTableCell>Status</StyledTableCell>
                <StyledTableCell align="right">Actions</StyledTableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : filteredRequests
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((request) => (
                  <StyledTableRow key={request.id}>
                    <StyledTableCell>
                      <Typography variant="body1" fontWeight={500}>
                        {request.customerName}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell>{request.company}</StyledTableCell>
                    <StyledTableCell>{request.district}</StyledTableCell>
                    <StyledTableCell>{formatDate(request.createdAt)}</StyledTableCell>
                    <StyledTableCell>
                      <StatusChip
                        label={request.status}
                        status={request.status}
                        size="small"
                      />
                    </StyledTableCell>
                    <StyledTableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        {request.status === 'pending' && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<EditIcon />}
                            onClick={() => handleEditRequest(request)}
                            sx={{ borderRadius: 2 }}
                          >
                            Edit
                          </Button>
                        )}
                        {request.status === 'approved' && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<VisibilityIcon />}
                            onClick={() => handleViewApprovalDetails(request)}
                            sx={{ borderRadius: 2 }}
                            color="success"
                          >
                            View Details
                          </Button>
                        )}
                        {request.status === 'rejected' && (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<InfoIcon />}
                            onClick={() => handleViewReason(request)}
                            sx={{ borderRadius: 2 }}
                            color="error"
                          >
                            View Reason
                          </Button>
                        )}
                      </Box>
                    </StyledTableCell>
                  </StyledTableRow>
                ))}
              {filteredRequests.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        No requests found
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRequests.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon color="primary" />
            <Typography variant="h6" fontWeight={600}>
              Edit Petrol Pump Request: {editedRequest?.customerName}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3} direction="column">
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                <BusinessIcon />
                Basic Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} sx={{ width: '300px' }}>
                <FormControl fullWidth required>
                  <InputLabel>Company</InputLabel>
                  <Select
                    value={editedRequest?.company || ''}
                    label="Company"
                    onChange={(e) => handleEditChange('company', e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <BusinessIcon color="action" />
                      </InputAdornment>
                    }
                  >
                    <MenuItem value="HPCL">HPCL</MenuItem>
                    <MenuItem value="BPCL">BPCL</MenuItem>
                    <MenuItem value="IOCL">IOCL</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} sx={{ width: '400px' }}>
                <TextField
                  fullWidth
                  label="Customer Name"
                  value={editedRequest?.customerName || ''}
                  onChange={(e) => handleEditChange('customerName', e.target.value)}
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ width: '300px' }}>
                <TextField
                  fullWidth
                  label="SAP Code"
                  value={editedRequest?.sapCode || ''}
                  onChange={(e) => handleEditChange('sapCode', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ width: '400px' }}>
                <TextField
                  fullWidth
                  label="Dealer Name"
                  value={editedRequest?.dealerName || ''}
                  onChange={(e) => handleEditChange('dealerName', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
            {/* Company Information and Contact Information Sections Side by Side */}
            <Grid container spacing={3}>
              {/* Company Information Section - 80% */}
              <Grid item xs={12} md={8.6} sx={{ width: '650px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 2 }}>
                  <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Company Information
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} sx={{ width: '200px' }}>
                    <FormControl fullWidth>
                      <InputLabel>Zone</InputLabel>
                      <Select
                        value={editedRequest?.zone || ''}
                        onChange={(e) => handleEditChange('zone', e.target.value)}
                        startAdornment={
                          <InputAdornment position="start">
                            <BusinessIcon color="action" />
                          </InputAdornment>
                        }
                      >
                        {zoneOptions.map((zone) => (
                          <MenuItem key={zone} value={zone}>
                            {zone}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} sx={{ width: '400px' }}>
                    <TextField
                      fullWidth
                      label="Sales Area"
                      value={editedRequest?.salesArea || ''}
                      onChange={(e) => handleEditChange('salesArea', e.target.value)}
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6} sx={{ width: '200px' }}>
                    <FormControl fullWidth>
                      <InputLabel>CO/CL/DO</InputLabel>
                      <Select
                        value={editedRequest?.coClDo || ''}
                        onChange={(e) => handleEditChange('coClDo', e.target.value)}
                        startAdornment={
                          <InputAdornment position="start">
                            <BusinessIcon color="action" />
                          </InputAdornment>
                        }
                      >
                        <MenuItem value="CO">CO</MenuItem>
                        <MenuItem value="CL">CL</MenuItem>
                        <MenuItem value="DO">DO</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={6} sx={{ width: '400px' }}>
                    <TextField
                      fullWidth
                      label="Regional Office"
                      value={editedRequest?.regionalOffice || ''}
                      onChange={(e) => handleEditChange('regionalOffice', e.target.value)}
                      variant="outlined"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BusinessIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </Grid>

              {/* Contact Information Section - 20% */}
              <Grid item xs={12} md={3.6} sx={{ width: '300px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 2 }}>
                  <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Contact Information
                  </Typography>
                </Box>

                <Grid item xs={12} sm={6} sx={{ width: '300px' }}>
                  <TextField
                    fullWidth
                    label="Contact Details"
                    value={editedRequest?.contactDetails || ''}
                    onChange={(e) => handleEditChange('contactDetails', e.target.value)}
                    required
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
            
            {/* Address Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', mt: 2 }}>
                <LocationIcon />
                Address Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid container spacing={2}>
              
              <Grid item xs={12} sm={6} sx={{ width: '300px' }}>
                <Autocomplete
                  freeSolo
                  value={editedRequest?.district || ''}
                  onChange={(event, newValue) => {
                    if (typeof newValue === 'string') {
                      handleEditChange('district', newValue);
                    } else if (newValue && newValue.inputValue) {
                      handleEditChange('district', newValue.inputValue);
                    } else if (newValue) {
                      handleEditChange('district', newValue.title);
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    handleEditChange('district', newInputValue);
                  }}
                  options={districts.map((district) => ({
                    title: district,
                    inputValue: district
                  }))}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      return option;
                    }
                    if (option.inputValue) {
                      return option.inputValue;
                    }
                    return option.title;
                  }}
                  filterOptions={(options, params) => {
                    const filtered = options.filter((option) =>
                      option.title.toLowerCase().includes(params.inputValue.toLowerCase())
                    );
                    
                    const { inputValue } = params;
                    const isExisting = options.some((option) => inputValue === option.title);
                    if (inputValue !== '' && !isExisting) {
                      filtered.push({
                        inputValue,
                        title: `Add "${inputValue}"`,
                      });
                    }
                    
                    return filtered;
                  }}
                  renderOption={(props, option) => (
                    <li {...props}>
                      {option.title}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="District"
                      required
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {fetchingDistricts ? (
                              <CircularProgress size={20} sx={{ mr: 1 }} />
                            ) : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Pincode"
                  value={editedRequest?.pincode || ''}
                  onChange={(e) => handleEditChange('pincode', e.target.value)}
                  required
                  variant="outlined"
                  inputProps={{ maxLength: 6 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} sx={{ width: '600px' }}>
                <TextField
                  fullWidth
                  label="Address Line 1"
                  value={editedRequest?.addressLine1 || ''}
                  onChange={(e) => handleEditChange('addressLine1', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ width: '600px' }}>
                <TextField
                  fullWidth
                  label="Address Line 2"
                  value={editedRequest?.addressLine2 || ''}
                  onChange={(e) => handleEditChange('addressLine2', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
            
            {/* Location Information */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', mt: 2 }}>
                <MyLocationIcon />
                Location Coordinates
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Latitude"
                  type="number"
                  value={editedRequest?.latitude || ''}
                  onChange={(e) => handleEditChange('latitude', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MyLocationIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Enter latitude (e.g., 20.5937)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Longitude"
                  type="number"
                  value={editedRequest?.longitude || ''}
                  onChange={(e) => handleEditChange('longitude', e.target.value)}
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <MyLocationIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Enter longitude (e.g., 78.9629)"
                />
              </Grid>
            </Grid>

            {/* Location Map */}
            {(editedRequest?.latitude && editedRequest?.longitude) && (
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main', mt: 2 }}>
                    <MyLocationIcon />
                    Location Map
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    startIcon={<MyLocationIcon />}
                    onClick={() => {
                      const url = `https://www.google.com/maps?q=${editedRequest.latitude},${editedRequest.longitude}`;
                      window.open(url, '_blank');
                    }}
                    sx={{ 
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                      fontWeight: 500
                    }}
                  >
                    View in Larger Map
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 300, 
                    borderRadius: 2, 
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'grey.100'
                  }}
                >
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${editedRequest.latitude},${editedRequest.longitude}`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </Box>
                
                <Box sx={{ mt: 1, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Latitude:</strong> {editedRequest.latitude}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Longitude:</strong> {editedRequest.longitude}
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)} 
            variant="outlined"
            color="inherit"
            startIcon={<CancelIcon />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveEditedRequest} 
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{ 
              borderRadius: 2, 
              px: 3,
              boxShadow: '0 4px 12px rgba(58, 134, 255, 0.2)'
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Details Dialog */}
      <Dialog
        open={reasonDialogOpen}
        onClose={() => setReasonDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedRequest?.status === 'approved' ? (
              <VisibilityIcon color="success" />
            ) : (
              <InfoIcon color="error" />
            )}
            <Typography variant="h6">
              {selectedRequest?.status === 'approved' ? 'Approval Details' : 'Rejection Reason'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Request Details:</strong>
              </Typography>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Customer Name:</strong> {selectedRequest.customerName}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Company:</strong> {selectedRequest.company}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>District:</strong> {selectedRequest.district}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Requested On:</strong> {formatDate(selectedRequest.createdAt)}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              {selectedRequest.status === 'approved' ? (
                <>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    <strong>Approval Details:</strong>
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'success.light', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'success.main'
                  }}>
                    <Typography variant="body1">
                      {selectedRequest.approvalReason || 'No approval notes provided'}
                    </Typography>
                  </Box>
                  
                  {selectedRequest.approvedBy && (
                    <Box sx={{ mt: 2 }}>
                      {/* <Typography variant="body2" color="text.secondary">
                        <strong>Approved by:</strong> {selectedRequest.approvedBy}
                      </Typography> */}
                    </Box>
                  )}
                  
                  {selectedRequest.approvedAt && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Approved on:</strong> {formatDate(selectedRequest.approvedAt)}
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    <strong>Rejection Reason:</strong>
                  </Typography>
                  <Box sx={{ 
                    p: 2, 
                    bgcolor: 'error.light', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'error.main'
                  }}>
                    <Typography variant="body1">
                      {selectedRequest.rejectionReason || 'No reason provided'}
                    </Typography>
                  </Box>
                  
                  {selectedRequest.rejectedBy && (
                    <Box sx={{ mt: 2 }}>
                      {/* <Typography variant="body2" color="text.secondary">
                        <strong>Rejected by:</strong> {selectedRequest.rejectedBy}
                      </Typography> */}
                    </Box>
                  )}
                  
                  {selectedRequest.rejectedAt && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Rejected on:</strong> {formatDate(selectedRequest.rejectedAt)}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setReasonDialogOpen(false)}
            variant="outlined"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PetrolPumpRequestsEdit; 