package com.scribd.clone.dto;

public class ReadingProgressDto {
    private Integer lastPage;
    private Double progressPercent;

    public ReadingProgressDto() {}
    public ReadingProgressDto(Integer lastPage, Double progressPercent) {
        this.lastPage = lastPage;
        this.progressPercent = progressPercent;
    }

    public Integer getLastPage() { return lastPage; }
    public void setLastPage(Integer lastPage) { this.lastPage = lastPage; }
    public Double getProgressPercent() { return progressPercent; }
    public void setProgressPercent(Double progressPercent) { this.progressPercent = progressPercent; }
}
