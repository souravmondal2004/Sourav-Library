package com.scribd.clone.dto;

public class AdminStatsDto {
    private long totalDocuments;
    private long publishedDocuments;
    private long totalViews;
    private long totalDownloads;
    private long totalCategories;
    private long totalUsers;
    private long totalStorageBytes;
    private String formattedStorage;

    public AdminStatsDto() {}

    public AdminStatsDto(long totalDocuments, long publishedDocuments, long totalViews, 
                         long totalDownloads, long totalCategories, long totalUsers, 
                         long totalStorageBytes, String formattedStorage) {
        this.totalDocuments = totalDocuments;
        this.publishedDocuments = publishedDocuments;
        this.totalViews = totalViews;
        this.totalDownloads = totalDownloads;
        this.totalCategories = totalCategories;
        this.totalUsers = totalUsers;
        this.totalStorageBytes = totalStorageBytes;
        this.formattedStorage = formattedStorage;
    }

    public long getTotalDocuments() { return totalDocuments; }
    public void setTotalDocuments(long totalDocuments) { this.totalDocuments = totalDocuments; }
    public long getPublishedDocuments() { return publishedDocuments; }
    public void setPublishedDocuments(long publishedDocuments) { this.publishedDocuments = publishedDocuments; }
    public long getTotalViews() { return totalViews; }
    public void setTotalViews(long totalViews) { this.totalViews = totalViews; }
    public long getTotalDownloads() { return totalDownloads; }
    public void setTotalDownloads(long totalDownloads) { this.totalDownloads = totalDownloads; }
    public long getTotalCategories() { return totalCategories; }
    public void setTotalCategories(long totalCategories) { this.totalCategories = totalCategories; }
    public long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(long totalUsers) { this.totalUsers = totalUsers; }
    public long getTotalStorageBytes() { return totalStorageBytes; }
    public void setTotalStorageBytes(long totalStorageBytes) { this.totalStorageBytes = totalStorageBytes; }
    public String getFormattedStorage() { return formattedStorage; }
    public void setFormattedStorage(String formattedStorage) { this.formattedStorage = formattedStorage; }
}
