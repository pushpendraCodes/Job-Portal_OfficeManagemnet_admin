export interface AdminUser {
  id: string;
  accountType: "admin";
  email?: string;
  status: string;
}

export interface EmployerRow {
  _id: string;
  mobile?: string;
  email?: string;
  status: string;
  preferredLocale?: "en" | "hi";
  createdAt?: string;
  profile?: EmployerProfile | null;
}

export interface EmployerProfile {
  _id?: string;
  userId?: string;
  companyName?: string;
  companyNameHi?: string;
  ownerName?: string;
  gstNumber?: string;
  panNumber?: string;
  companyType?: string;
  employeeCount?: string;
  establishedYear?: number;
  contactPersonName?: string;
  contactDesignation?: string;
  contactEmail?: string;
  contactMobile?: string;
  altMobile?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  industryType?: string;
  logoUrl?: string;
  website?: string;
  description?: string;
  descriptionHi?: string;
  isOfficeEnabled?: boolean;
  registrationCompleted?: boolean;
}

export interface EmployerDetail {
  user: EmployerRow;
  profile: EmployerProfile | null;
  counts: {
    jobs: number;
    employees: number;
    tasks: number;
    attendance: number;
    expenditures: number;
    sites: number;
  };
  finance: { credit: number; debit: number; balance: number };
  jobs: Array<{
    _id: string;
    titleEn: string;
    titleHi?: string;
    city: string;
    status: string;
    createdAt?: string;
  }>;
  employees: Array<{
    _id: string;
    fullName: string;
    mobile: string;
    designation?: string;
    department?: string;
    status: string;
    joiningDate?: string;
  }>;
  tasks: Array<{
    _id: string;
    title: string;
    status: string;
    priority: string;
    dueDate?: string;
    assignedToEmployeeIds?: Array<{ fullName?: string; mobile?: string }>;
  }>;
  attendance: Array<{
    _id: string;
    date: string;
    status: string;
    loginAt?: string;
    logoutAt?: string;
    workedMinutes?: number;
    employeeId?: { fullName?: string; mobile?: string; designation?: string };
  }>;
  expenditures: Array<{
    _id: string;
    type: string;
    amount: number;
    category: string;
    transactionDate: string;
    description?: string;
  }>;
  sites: Array<{
    _id: string;
    name: string;
    city?: string;
    address?: string;
    isPrimary?: boolean;
    isActive?: boolean;
  }>;
  salaries: Array<{
    _id: string;
    year: number;
    month: number;
    netAmount: number;
    status: string;
    employeeId?: string;
  }>;
}

export interface EmployeeRow {
  _id: string;
  fullName: string;
  mobile: string;
  status: string;
  employerId: string;
  designation?: string;
  department?: string;
  employeeCode?: string;
  joiningDate?: string;
  baseSalary?: number;
  employerProfileId?: { companyName?: string; city?: string; ownerName?: string };
}

export interface SeekerRow {
  _id: string;
  mobile?: string;
  email?: string;
  status: string;
  createdAt?: string;
  applicationsCount?: number;
  profile?: {
    fullName?: string;
    city?: string;
    skills?: string[];
    headline?: string;
    experienceYears?: number;
    photoUrl?: string;
    registrationCompleted?: boolean;
  } | null;
}

export interface JobRow {
  _id: string;
  titleEn: string;
  titleHi?: string;
  city: string;
  state?: string;
  status: string;
  applicationsCount?: number;
  viewsCount?: number;
  publishedAt?: string;
  createdAt?: string;
  approvedAt?: string;
  vacancies?: number;
  employerProfileId?: { companyName?: string; city?: string; ownerName?: string };
  categoryId?: { nameEn?: string; nameHi?: string };
}

export interface LeadRow {
  _id: string;
  accountType: string;
  mobile: string;
  formData: Record<string, unknown>;
  progressPercent: number;
  lastStep?: string;
  status: string;
  locale?: string;
  notes?: string;
  updatedAt?: string;
}

export interface CategoryRow {
  _id: string;
  nameEn: string;
  nameHi: string;
  slug: string;
  parentId?: string | null;
  descriptionEn?: string;
  descriptionHi?: string;
  iconUrl?: string;
  sortOrder?: number;
  isActive: boolean;
  subcategories?: CategoryRow[];
}

export interface ExpenditureRow {
  _id: string;
  type: string;
  amount: number;
  category: string;
  transactionDate: string;
  description?: string;
  employerId: string;
  employerProfileId?:
    | string
    | {
        companyName?: string;
        companyNameHi?: string;
        city?: string;
      };
  employeeId?:
    | string
    | {
        fullName?: string;
        mobile?: string;
        designation?: string;
      };
}
